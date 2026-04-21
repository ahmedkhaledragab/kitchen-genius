// supabase/functions/generate-recipes/index.ts
// Calls Lovable AI Gateway with tool-calling for structured recipe output.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  ingredients: string[];
  exclude?: string[];
  filters?: string[]; // e.g. "quick", "budget", "healthy", "arabic"
  language?: "ar" | "en";
}

const tool = {
  type: "function",
  function: {
    name: "suggest_recipes",
    description: "Return 3-5 recipes the user can cook with the given ingredients.",
    parameters: {
      type: "object",
      properties: {
        recipes: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short recipe name." },
              description: { type: "string", description: "1-2 sentence summary." },
              ingredients: {
                type: "array",
                items: { type: "string" },
                description: "All ingredients used with simple quantities.",
              },
              missing_ingredients: {
                type: "array",
                items: { type: "string" },
                description: "Items the user didn't have but are needed (may be empty).",
              },
              steps: {
                type: "array",
                items: { type: "string" },
                description: "Short imperative steps.",
              },
              estimated_time_minutes: { type: "number" },
              difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "e.g. quick, healthy, budget, arabic, vegetarian",
              },
              cuisine: { type: "string" },
            },
            required: [
              "title",
              "description",
              "ingredients",
              "missing_ingredients",
              "steps",
              "estimated_time_minutes",
              "difficulty",
              "tags",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["recipes"],
      additionalProperties: false,
    },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth + per-user daily limit ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "سجّل دخول الأول." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read admin-controlled settings (target recipe count + daily limit).
    // Fall back to safe defaults if the row is missing or the columns are not set.
    let targetCount = 3;
    let dailyLimit = 4;
    try {
      const { data: cfg } = await admin
        .from("site_settings")
        .select("recipes_target_count, recipes_daily_limit")
        .limit(1)
        .maybeSingle();
      if (cfg) {
        if (typeof cfg.recipes_target_count === "number" && cfg.recipes_target_count > 0) {
          targetCount = Math.min(Math.max(cfg.recipes_target_count, 1), 10);
        }
        if (typeof cfg.recipes_daily_limit === "number" && cfg.recipes_daily_limit > 0) {
          dailyLimit = Math.min(Math.max(cfg.recipes_daily_limit, 1), 100);
        }
      }
    } catch (e) {
      console.warn("could not read site_settings, using defaults", e);
    }

    // ----- Device-bound limit (shared across multiple accounts on same device/IP) -----
    // Check device limit BEFORE per-user limit so creating extra accounts on the
    // same browser doesn't bypass the cap. Identity is the client-supplied
    // device id (random + browser fingerprint) with IP as fallback.
    const reqBodyRaw = await req.json().catch(() => ({}));
    const deviceId =
      typeof reqBodyRaw.deviceId === "string" ? reqBodyRaw.deviceId.slice(0, 200) : "";
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      "";

    const { data: deviceUsage, error: deviceErr } = await admin.rpc(
      "check_and_increment_device_usage",
      {
        _user_id: user.id,
        _device_id: deviceId,
        _ip: clientIp,
        _feature: "generate_recipes",
        _default_limit: dailyLimit,
      },
    );
    if (deviceErr) {
      console.error("device usage rpc error", deviceErr);
      // Non-fatal — fall through to per-user check
    } else {
      const d = deviceUsage as { allowed: boolean; reason?: string; used?: number; limit?: number };
      if (!d.allowed) {
        return new Response(
          JSON.stringify({
            error: "device_limit_reached",
            message: `وصلت لحد الاستخدام اليومي للجهاز (${d.used}/${d.limit}). جرّب تاني بكرة.`,
            used: d.used,
            limit: d.limit,
            scope: "device",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { data: usage, error: usageError } = await admin.rpc("check_and_increment_usage", {
      _user_id: user.id,
      _feature: "generate_recipes",
      _default_limit: dailyLimit,
    });
    if (usageError) {
      console.error("usage rpc error", usageError);
      return new Response(
        JSON.stringify({ error: "usage_error", message: "تعذّر التحقق من الاستخدام." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const u = usage as { allowed: boolean; reason?: string; used?: number; limit?: number };
    if (!u.allowed) {
      const msg = u.reason === "banned"
        ? "حسابك موقوف. تواصل مع الإدارة."
        : u.reason === "limit_reached"
          ? `وصلت لحد الاستخدام اليومي (${u.used}/${u.limit}). جرّب تاني بكرة.`
          : "غير مسموح.";
      return new Response(
        JSON.stringify({ error: u.reason ?? "blocked", message: msg, used: u.used, limit: u.limit, scope: "user" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: ReqBody = reqBodyRaw as ReqBody;
    const ingredients = (body.ingredients ?? []).filter(Boolean);
    const exclude = (body.exclude ?? []).filter(Boolean);
    const filters = body.filters ?? [];
    // Extract kitchen tag sent by the frontend (e.g. "kitchen:italian").
    const kitchenTag = filters.find((f) => f.startsWith("kitchen:"));
    const kitchenSlug = kitchenTag ? kitchenTag.slice("kitchen:".length) : null;
    // Keep user-facing filters (quick/healthy/etc.) separate from the kitchen tag.
    const userFilters = filters.filter((f) => !f.startsWith("kitchen:"));

    // Look up the kitchen's display names so we can tell the AI *which* cuisine
    // to cook. Without this, picking "Italian" and entering pizza ingredients
    // could return Egyptian/Moroccan recipes — which is exactly the bug.
    let kitchenNameAr: string | null = null;
    let kitchenNameEn: string | null = null;
    const language = body.language === "en" ? "en" : "ar";

    if (kitchenSlug) {
      try {
        const { data: k } = await admin
          .from("kitchens")
          .select("id, name_ar, name_en")
          .eq("slug", kitchenSlug)
          .maybeSingle();
        if (k) {
          kitchenNameAr = k.name_ar;
          kitchenNameEn = k.name_en;
        }
      } catch (e) {
        console.error("kitchen lookup failed:", e);
      }
    }

    if (ingredients.length === 0) {
      return new Response(JSON.stringify({ error: "No ingredients provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============== LOCAL-FIRST HYBRID SEARCH ==============
    // Search recipes table first. Always return any local matches found,
    // then top up with AI to reach TARGET_COUNT total recipes.
    // TARGET_COUNT is admin-controlled via site_settings.recipes_target_count.
    const TARGET_COUNT = targetCount;
    const norm = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, "") // strip Arabic diacritics
        .replace(/[إأآا]/g, "ا")
        .replace(/[ىي]/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ");

    // Ingredient synonyms — Arabic dialects + English equivalents.
    // Each group maps to a canonical key. e.g. "فراخ" and "دجاج" both → "chicken".
    // This makes local recipe search find a "chicken" recipe even if the user
    // typed "فراخ" or vice versa.
    const SYNONYM_GROUPS: string[][] = [
      ["فراخ", "دجاج", "فرخه", "chicken", "poultry"],
      ["طماطم", "بندوره", "قوطه", "tomato", "tomatoes"],
      ["بطاطس", "بطاطا", "potato", "potatoes"],
      ["بصل", "بصله", "onion", "onions"],
      ["ثوم", "توم", "garlic"],
      ["جبنه", "جبن", "cheese"],
      ["جبنه بيضا", "جبنه فيتا", "feta"],
      ["جبنه موزاريلا", "موتزاريلا", "mozzarella"],
      ["لحمه", "لحم", "بقري", "beef", "meat"],
      ["لحمه مفرومه", "لحم مفروم", "كفته", "minced meat", "ground beef"],
      ["خروف", "ضاني", "ضان", "غنم", "lamb", "mutton"],
      ["سمك", "حوت", "fish"],
      ["جمبري", "روبيان", "قريدس", "shrimp", "prawn", "prawns"],
      ["بيض", "بيضه", "egg", "eggs"],
      ["لبن", "حليب", "milk"],
      ["زبده", "زبد", "سمنه", "سمن", "butter", "ghee"],
      ["زيت", "زيت زيتون", "oil", "olive oil"],
      ["عيش", "خبز", "bread"],
      ["دقيق", "طحين", "flour"],
      ["ارز", "رز", "rice"],
      ["مكرونه", "معكرونه", "باستا", "pasta", "macaroni"],
      ["شطه", "فلفل حار", "هريسه", "chili", "chilli", "hot pepper"],
      ["فلفل", "فلفل اخضر", "فلفل رومي", "فليفله", "pepper", "bell pepper", "capsicum"],
      ["كوسه", "kousa", "zucchini"],
      ["باذنجان", "بزنجان", "eggplant", "aubergine"],
      ["خس", "خساس", "lettuce"],
      ["جزر", "carrot", "carrots"],
      ["خيار", "cucumber"],
      ["ليمون", "lemon", "lime"],
      ["برتقال", "orange"],
      ["تفاح", "apple", "apples"],
      ["موز", "banana"],
      ["سكر", "sugar"],
      ["ملح", "salt"],
      ["فلفل اسود", "black pepper"],
      ["كمون", "cumin"],
      ["كزبره", "كزبره ناشفه", "coriander", "cilantro"],
      ["بقدونس", "معدنوس", "parsley"],
      ["نعناع", "mint"],
      ["شبت", "dill"],
      ["خل", "vinegar"],
      ["طحينه", "tahini", "sesame paste"],
      ["زبادي", "روب", "yogurt", "yoghurt"],
      ["قشطه", "كريمه", "كريمه طازه", "cream"],
      ["شيكولاته", "شوكولاته", "chocolate"],
      ["عسل", "honey"],
      ["تمر", "بلح", "date", "dates"],
      ["جوز", "عين جمل", "walnut", "walnuts"],
      ["لوز", "almond", "almonds"],
    ];

    // Build a map: normalized term → canonical key (just the first item normalized).
    const synonymMap = new Map<string, string>();
    for (const group of SYNONYM_GROUPS) {
      const canonical = norm(group[0]);
      for (const term of group) {
        synonymMap.set(norm(term), canonical);
      }
    }

    // Expand a normalized term into all its known synonyms (for matching).
    // Returns at minimum the original term so non-synonym words still match.
    const expandTerm = (t: string): string[] => {
      const canonical = synonymMap.get(t);
      if (!canonical) return [t];
      const synonyms: string[] = [t];
      for (const [key, val] of synonymMap.entries()) {
        if (val === canonical && key !== t) synonyms.push(key);
      }
      return synonyms;
    };

    const userIngsNorm = ingredients.map(norm).filter(Boolean);
    const excludeNorm = exclude.map(norm).filter(Boolean);
    // Pre-expand user ingredients with synonyms once.
    const userIngsExpanded = userIngsNorm.map(expandTerm);

    // Identify "core" protein/main ingredients the user listed. If they
    // typed fish, chicken, shrimp, beef, lamb or eggs we MUST guarantee at
    // least one of those proteins appears in any recipe we return — otherwise
    // we surface unrelated dishes (e.g. fig appetizer when user asked for fish).
    const PROTEIN_CANONICALS = new Set([
      norm("سمك"),
      norm("فراخ"),
      norm("جمبري"),
      norm("لحمه"),
      norm("لحمه مفرومه"),
      norm("خروف"),
      norm("بيض"),
    ]);
    const userProteinCanonicals = new Set<string>();
    for (const ing of userIngsNorm) {
      const canonical = synonymMap.get(ing);
      if (canonical && PROTEIN_CANONICALS.has(canonical)) {
        userProteinCanonicals.add(canonical);
      }
    }
    // Build the set of all synonym terms that satisfy "user has a protein".
    const requiredProteinTerms: string[] = [];
    if (userProteinCanonicals.size > 0) {
      for (const [term, canonical] of synonymMap.entries()) {
        if (userProteinCanonicals.has(canonical)) requiredProteinTerms.push(term);
      }
    }

    type LocalRecipeOut = {
      id: string;
      title: string;
      description: string;
      ingredients: string[];
      missing_ingredients: string[];
      steps: string[];
      estimated_time_minutes: number;
      difficulty: string;
      tags: string[];
      cuisine?: string;
      image_url?: string;
      source: "local";
    };

    let localMatches: LocalRecipeOut[] = [];

    try {
      const { data: pool } = await admin
        .from("recipes")
        .select("id,title,description,ingredients,missing_ingredients,steps,estimated_time_minutes,difficulty,tags,cuisine,language,image_url")
        .eq("is_published", true)
        .eq("language", language)
        .limit(500);

      type DbRecipe = {
        id: string;
        title: string;
        description: string | null;
        ingredients: unknown;
        missing_ingredients: unknown;
        steps: unknown;
        estimated_time_minutes: number | null;
        difficulty: string;
        tags: string[] | null;
        cuisine: string | null;
        language: string;
        image_url: string | null;
      };

      const scored: { r: DbRecipe; matched: number; missing: number }[] = [];
      for (const r of (pool ?? []) as DbRecipe[]) {
        const ings: string[] = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
        const ingsNorm = ings.map((x) => norm(String(x)));

        const hasExcluded = excludeNorm.some((ex) =>
          ingsNorm.some((ing) => ing.includes(ex)),
        );
        if (hasExcluded) continue;

        if (userFilters.length) {
          const tagsNorm = (r.tags ?? []).map(norm);
          const allMatch = userFilters.every((f) => tagsNorm.some((t) => t.includes(norm(f))));
          if (!allMatch) continue;
        }

        // Kitchen filter: only keep recipes whose cuisine matches the selected
        // kitchen (match by slug OR by kitchen name in Arabic/English).
        if (kitchenSlug) {
          const recipeCuisineNorm = norm(r.cuisine ?? "");
          const slugNorm = norm(kitchenSlug);
          const arNorm = kitchenNameAr ? norm(kitchenNameAr) : "";
          const enNorm = kitchenNameEn ? norm(kitchenNameEn) : "";
          const cuisineMatches =
            !!recipeCuisineNorm &&
            (recipeCuisineNorm.includes(slugNorm) ||
              (arNorm && recipeCuisineNorm.includes(arNorm)) ||
              (enNorm && recipeCuisineNorm.includes(enNorm)));
          // Also accept if any tag mentions the kitchen name/slug.
          const tagsNorm = (r.tags ?? []).map(norm);
          const tagMatches = tagsNorm.some(
            (t) =>
              t.includes(slugNorm) ||
              (arNorm && t.includes(arNorm)) ||
              (enNorm && t.includes(enNorm)),
          );
          if (!cuisineMatches && !tagMatches) continue;
        }

        // Match using synonym expansion: a recipe ingredient counts as matched
        // if any synonym of the user's ingredient appears in it (or vice versa).
        let matched = 0;
        for (const variants of userIngsExpanded) {
          if (
            ingsNorm.some((ing) =>
              variants.some((v) => ing.includes(v) || v.includes(ing)),
            )
          ) {
            matched++;
          }
        }
        if (matched === 0) continue;

        const missing = Math.max(0, ingsNorm.length - matched);
        scored.push({ r, matched, missing });
      }

      scored.sort((a, b) => b.matched - a.matched || a.missing - b.missing);

      localMatches = scored.slice(0, TARGET_COUNT).map(({ r }) => {
        const ings: string[] = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
        const ingsNorm = ings.map((x) => norm(String(x)));
        const missingList = ings.filter((_, i) => {
          const ing = ingsNorm[i];
          return !userIngsExpanded.some((variants) =>
            variants.some((v) => ing.includes(v) || v.includes(ing)),
          );
        });
        return {
          id: r.id,
          title: r.title,
          description: r.description ?? "",
          ingredients: ings,
          missing_ingredients: missingList,
          steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
          estimated_time_minutes: r.estimated_time_minutes ?? 30,
          difficulty: r.difficulty,
          tags: r.tags ?? [],
          cuisine: r.cuisine ?? undefined,
          image_url: r.image_url ?? undefined,
          source: "local" as const,
        };
      });

      console.log(`local search found ${localMatches.length} matches by ingredient`);

      // FALLBACK 1: if no ingredient matches in this kitchen, return the
      // top recipes from the same kitchen anyway (sorted by recent). The user
      // explicitly chose this kitchen, so showing local recipes from it is
      // far better than burning AI credits on a generic answer.
      if (localMatches.length === 0 && kitchenSlug) {
        try {
          const { data: kitchenPool } = await admin
            .from("recipes")
            .select(
              "id,title,description,ingredients,missing_ingredients,steps,estimated_time_minutes,difficulty,tags,cuisine,language,image_url",
            )
            .eq("is_published", true)
            .eq("language", language)
            .eq("cuisine", kitchenSlug)
            .order("created_at", { ascending: false })
            .limit(TARGET_COUNT * 2);

          const filtered = (kitchenPool ?? []).filter((r) => {
            const ings: string[] = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
            const ingsNorm = ings.map((x) => norm(String(x)));
            return !excludeNorm.some((ex) => ingsNorm.some((ing) => ing.includes(ex)));
          });

          localMatches = filtered.slice(0, TARGET_COUNT).map((r) => {
            const ings: string[] = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
            const ingsNorm = ings.map((x) => norm(String(x)));
            const missingList = ings.filter((_, i) => {
              const ing = ingsNorm[i];
              return !userIngsExpanded.some((variants) =>
                variants.some((v) => ing.includes(v) || v.includes(ing)),
              );
            });
            return {
              id: r.id,
              title: r.title,
              description: r.description ?? "",
              ingredients: ings,
              missing_ingredients: missingList,
              steps: Array.isArray(r.steps) ? (r.steps as string[]) : [],
              estimated_time_minutes: r.estimated_time_minutes ?? 30,
              difficulty: r.difficulty,
              tags: r.tags ?? [],
              cuisine: r.cuisine ?? undefined,
              image_url: r.image_url ?? undefined,
              source: "local" as const,
            };
          });
          console.log(`fallback kitchen-only search found ${localMatches.length} matches`);
        } catch (e) {
          console.error("fallback kitchen search failed:", e);
        }
      }

      // PREFER LOCAL: if local already covers the full target count, skip AI.
      // Otherwise we'll fall through and let AI top up the remaining slots
      // (e.g. user wants 3 recipes, local has 2 → AI generates 1 more).
      if (localMatches.length >= TARGET_COUNT) {
        return new Response(
          JSON.stringify({ recipes: localMatches.slice(0, TARGET_COUNT), source: "local" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } catch (e) {
      console.error("local search failed, falling back to AI only:", e);
    }
    // ============== END LOCAL-FIRST SEARCH ==============

    const aiNeeded = TARGET_COUNT - localMatches.length;
    // Tell the AI which recipe titles already came from local so it doesn't duplicate them.
    const localTitles = localMatches.map((r) => r.title);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemAr = `أنت طاهي محترف يقترح وصفات سهلة وعملية. اكتب كل الردود بالعربية الفصحى البسيطة والمصطلحات الشعبية المصرية. استعمل الأدوات (function calling) لإرجاع النتائج. اجعل الخطوات قصيرة وواضحة (5-8 خطوات كحد أقصى لكل وصفة).`;
    const systemEn = `You are a friendly chef. Suggest practical recipes from the user's ingredients. Reply in English. Use the tool to return structured results. Keep steps short (5-8 max per recipe).`;

    const kitchenText = kitchenSlug
      ? language === "ar"
        ? `مهم جداً: كل الوصفات لازم تكون من المطبخ ${kitchenNameAr ?? kitchenSlug} فقط. ممنوع تقترح أي وصفة من مطبخ تاني (مثلاً لو المطبخ إيطالي، ممنوع تقترح وصفات مصرية أو مغربية). ضع قيمة "cuisine" في كل وصفة = "${kitchenNameAr ?? kitchenSlug}".`
        : `VERY IMPORTANT: ALL recipes MUST be from the ${kitchenNameEn ?? kitchenSlug} cuisine only. Do NOT suggest recipes from any other cuisine. Set the "cuisine" field on every recipe to "${kitchenNameEn ?? kitchenSlug}".`
      : "";

    const filterText = userFilters.length
      ? language === "ar"
        ? `الفلاتر المطلوبة: ${userFilters.join("، ")}.`
        : `Filters: ${userFilters.join(", ")}.`
      : "";
    const excludeText = exclude.length
      ? language === "ar"
        ? `يجب استبعاد: ${exclude.join("، ")}.`
        : `Exclude: ${exclude.join(", ")}.`
      : "";

    const avoidText = localTitles.length
      ? language === "ar"
        ? `تجنّب تكرار هذه الوصفات اللي عندي بالفعل: ${localTitles.join("، ")}.`
        : `Avoid duplicating these recipes I already have: ${localTitles.join(", ")}.`
      : "";

    const userMsg =
      language === "ar"
        ? `${kitchenText}\nالمكونات المتوفرة عندي: ${ingredients.join("، ")}.\n${excludeText}\n${filterText}\n${avoidText}\nاقترح ${aiNeeded} وصفات جديدة أقدر أعملها بالمكونات دي${kitchenSlug ? ` من مطبخ ${kitchenNameAr ?? kitchenSlug} فقط` : ""}. حاول تستعمل أقل عدد من المكونات الناقصة.`
        : `${kitchenText}\nMy ingredients: ${ingredients.join(", ")}.\n${excludeText}\n${filterText}\n${avoidText}\nSuggest ${aiNeeded} new recipes I can make${kitchenSlug ? ` from ${kitchenNameEn ?? kitchenSlug} cuisine only` : ""}. Minimize missing ingredients.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: language === "ar" ? systemAr : systemEn },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "suggest_recipes" } },
      }),
    });

    if (!resp.ok) {
      // If AI fails but we have local matches, return them gracefully.
      if (localMatches.length > 0) {
        console.warn("AI failed, returning local matches only:", resp.status);
        return new Response(
          JSON.stringify({ recipes: localMatches, source: "local" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "حد الاستخدام انتهى مؤقتاً، حاول بعد دقيقة." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required", message: "الرصيد انتهى. أضف رصيد من إعدادات الاستخدام." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await resp.text();
      console.error("AI gateway error:", resp.status, txt);
      return new Response(
        JSON.stringify({ error: "ai_error", message: "تعذّر توليد الوصفات الآن." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("Missing tool call in response", JSON.stringify(data));
      if (localMatches.length > 0) {
        return new Response(
          JSON.stringify({ recipes: localMatches, source: "local" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "bad_response", message: "الرد غير مكتمل." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { recipes: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e);
      if (localMatches.length > 0) {
        return new Response(
          JSON.stringify({ recipes: localMatches, source: "local" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "parse_error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Merge: local first, then AI fills the rest (capped at TARGET_COUNT).
    const aiRecipes = (parsed.recipes ?? []).map((r) => ({ ...r, source: "ai" as const }));
    const merged = [...localMatches, ...aiRecipes].slice(0, TARGET_COUNT);
    const sourceLabel = localMatches.length > 0 && aiRecipes.length > 0
      ? "hybrid"
      : localMatches.length > 0
        ? "local"
        : "ai";

    return new Response(JSON.stringify({ recipes: merged, source: sourceLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recipes error:", e);
    return new Response(
      JSON.stringify({ error: "internal", message: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
