// Device identity used to share rate limits across multiple accounts on the
// same browser/device. Combines a stable random id stored in localStorage with
// a multi-signal browser fingerprint hash. The fingerprint is intentionally
// strong enough to make casual bypass (clearing storage, switching accounts,
// or opening a second profile) noticeably harder, while staying lightweight
// and privacy-respecting.
//
// Storage layers (any one survives → device is recognised):
//   1. localStorage             — primary id
//   2. sessionStorage           — survives reloads in the same tab
//   3. IndexedDB                — survives most "clear cookies" UX
//   4. Cookie (1y, SameSite=Lax) — survives localStorage clearing
//   5. Browser fingerprint hash — survives all of the above being cleared
//
// On read we reconcile every layer and re-seed any missing one so the same id
// keeps coming back even after partial cleanup.

const STORAGE_KEY = "app-device-id";
const COOKIE_KEY = "app_did";
const IDB_NAME = "app-device";
const IDB_STORE = "kv";
const FP_KEY = "app-device-fp";

// ---------- helpers ----------

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// djb2 → base36
function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

// ---------- fingerprint signals ----------

function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("device-fp-🍳-من اللي عندك", 2, 2);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("device-fp-🍳-من اللي عندك", 4, 17);
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function webglSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}|${gl.getParameter(gl.VERSION)}|${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`;
  } catch {
    return "";
  }
}

function fontsSignal(): string {
  try {
    const candidates = [
      "Arial",
      "Times New Roman",
      "Courier New",
      "Georgia",
      "Tahoma",
      "Verdana",
      "Cairo",
      "Segoe UI",
      "Helvetica",
      "Roboto",
    ];
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const text = "mmmmmmmmmmlli";
    const span = document.createElement("span");
    span.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;font-size:72px;line-height:normal;visibility:hidden";
    span.textContent = text;
    document.body.appendChild(span);
    const baselines: Record<string, { w: number; h: number }> = {};
    for (const b of baseFonts) {
      span.style.fontFamily = b;
      baselines[b] = { w: span.offsetWidth, h: span.offsetHeight };
    }
    const detected: string[] = [];
    for (const f of candidates) {
      let found = false;
      for (const b of baseFonts) {
        span.style.fontFamily = `'${f}',${b}`;
        const w = span.offsetWidth;
        const h = span.offsetHeight;
        if (w !== baselines[b].w || h !== baselines[b].h) {
          found = true;
          break;
        }
      }
      if (found) detected.push(f);
    }
    document.body.removeChild(span);
    return detected.join(",");
  } catch {
    return "";
  }
}

function audioSignal(): string {
  try {
    const AC =
      (window as Window & { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ||
      (window as Window & { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!AC) return "";
    const ctx = new AC(1, 44100, 44100);
    return `${ctx.sampleRate}|${ctx.destination.channelCount}|${ctx.destination.maxChannelCount}`;
  } catch {
    return "";
  }
}

function plugins(): string {
  try {
    if (!navigator.plugins) return "";
    return Array.from(navigator.plugins)
      .map((p) => p.name)
      .sort()
      .join(",");
  } catch {
    return "";
  }
}

function browserFingerprint(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "";

  // Cache the heavy parts so we only compute once per page load.
  try {
    const cached = window.sessionStorage.getItem(FP_KEY);
    if (cached) return cached;
  } catch {
    /* sessionStorage may be unavailable */
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
  };
  const screenObj = window.screen;

  const parts = [
    nav.userAgent,
    nav.language,
    Array.isArray(nav.languages) ? nav.languages.join(",") : "",
    nav.platform || nav.userAgentData?.platform || "",
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    String(nav.maxTouchPoints ?? ""),
    `${screenObj.width}x${screenObj.height}x${screenObj.colorDepth}`,
    `${screenObj.availWidth}x${screenObj.availHeight}`,
    String(window.devicePixelRatio || ""),
    new Date().getTimezoneOffset().toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    plugins(),
    fontsSignal(),
    canvasSignal(),
    webglSignal(),
    audioSignal(),
  ];

  const fp = hash(parts.join("|"));
  try {
    window.sessionStorage.setItem(FP_KEY, fp);
  } catch {
    /* ignore */
  }
  return fp;
}

// ---------- storage layers ----------

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 400 days is the modern browser cap; SameSite=Lax + Secure on https.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${60 * 60 * 24 * 400}; Path=/; SameSite=Lax${secure}`;
}

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeLocal(v: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

function readSession(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeSession(v: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, v);
  } catch {
    /* ignore */
  }
}

let idbCache: string | null = null;
function openIdb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function readIdb(): Promise<string | null> {
  if (idbCache) return idbCache;
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(STORAGE_KEY);
      req.onsuccess = () => {
        const v = (req.result as string | undefined) ?? null;
        idbCache = v;
        resolve(v);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function writeIdb(v: string) {
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(v, STORAGE_KEY);
    idbCache = v;
  } catch {
    /* ignore */
  }
}

// ---------- public API ----------

// Synchronous best-effort id used by the request path. Reconciles localStorage,
// sessionStorage, cookie, and fingerprint synchronously, then kicks off async
// IndexedDB sync in the background.
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  const fp = browserFingerprint();
  let id = readLocal() || readSession() || readCookie(COOKIE_KEY);

  if (!id) {
    // Seed with a stable id that always includes the fingerprint suffix.
    id = `${randomId()}-${fp}`;
  }

  // Re-seed every layer so partial cleanup can't escape.
  writeLocal(id);
  writeSession(id);
  writeCookie(COOKIE_KEY, id);
  // Best-effort async IDB sync.
  void (async () => {
    const idbVal = await readIdb();
    if (!idbVal) await writeIdb(id);
    else if (idbVal !== id) {
      // Prefer the older IDB id if it exists — keep limits sticky.
      writeLocal(idbVal);
      writeSession(idbVal);
      writeCookie(COOKIE_KEY, idbVal);
    }
  })();

  return id;
}
