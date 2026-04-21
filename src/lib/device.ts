// Device identity used to share rate limits across multiple accounts on the
// same browser/device. Combines a stable random id stored in localStorage with
// a lightweight browser fingerprint hash so clearing localStorage alone won't
// fully reset the device identity.

const STORAGE_KEY = "app-device-id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Cheap, deterministic fingerprint based on stable browser features.
// Not cryptographically strong — just raises the bar above "delete cookies".
function browserFingerprint(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "";
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ""),
    String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? ""),
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
    new Date().getTimezoneOffset().toString(),
  ];
  // Simple djb2-like hash → base36
  let h = 5381;
  const str = parts.join("|");
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `${randomId()}-${browserFingerprint()}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
