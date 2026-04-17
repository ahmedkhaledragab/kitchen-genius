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
    const { data: usage, error: usageError } = await admin.rpc("check_and_increment_usage", {
      _user_id: user.id,
      _feature: "generate_recipes",
      _default_limit: 10,
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
          ? `وصلت لحد الاستخدام اليومي (${u.used}/${u.limit}).`
          : "غير مسموح.";
      return new Response(
        JSON.stringify({ error: u.reason ?? "blocked", message: msg, used: u.used, limit: u.limit }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: ReqBody = await req.json();
    const ingredients = (body.ingredients ?? []).filter(Boolean);
    const exclude = (body.exclude ?? []).filter(Boolean);
    const filters = body.filters ?? [];
    const language = body.language === "en" ? "en" : "ar";

    if (ingredients.length === 0) {
      return new Response(JSON.stringify({ error: "No ingredients provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============== LOCAL-FIRST SEARCH ==============
    // Search the recipes table before calling AI. If we find >= 3 good matches,
    // return them without spending AI credits.
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

    const userIngsNorm = ingredients.map(norm).filter(Boolean);
    const excludeNorm = exclude.map(norm).filter(Boolean);

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

        // exclude check: if any excluded item appears in ingredients, skip
        const hasExcluded = excludeNorm.some((ex) =>
          ingsNorm.some((ing) => ing.includes(ex)),
        );
        if (hasExcluded) continue;

        // tag/filter check (best-effort)
        if (filters.length) {
          const tagsNorm = (r.tags ?? []).map(norm);
          const allMatch = filters.every((f) => tagsNorm.some((t) => t.includes(norm(f))));
          if (!allMatch) continue;
        }

        // matching: how many of user's ingredients appear in recipe ingredients
        let matched = 0;
        for (const u of userIngsNorm) {
          if (ingsNorm.some((ing) => ing.includes(u) || u.includes(ing))) matched++;
        }
        if (matched === 0) continue;

        const missing = Math.max(0, ingsNorm.length - matched);
        scored.push({ r, matched, missing });
      }

      // sort by most matched, then fewest missing
      scored.sort((a, b) => b.matched - a.matched || a.missing - b.missing);

      const topLocal = scored.slice(0, 5);
      if (topLocal.length >= 3) {
        const recipesOut = topLocal.map(({ r, matched }) => {
          const ings: string[] = Array.isArray(r.ingredients) ? (r.ingredients as string[]) : [];
          const ingsNorm = ings.map((x) => norm(String(x)));
          // missing_ingredients = recipe ingredients not present in user list
          const missingList = ings.filter((_, i) => {
            const ing = ingsNorm[i];
            return !userIngsNorm.some((u) => ing.includes(u) || u.includes(ing));
          });
          return {
            id: r.id,
            title: r.title,
            description: r.description ?? "",
            ingredients: ings,
            missing_ingredients: missingList,
            steps: Array.isArray(r.steps) ? r.steps : [],
            estimated_time_minutes: r.estimated_time_minutes ?? 30,
            difficulty: r.difficulty,
            tags: r.tags ?? [],
            cuisine: r.cuisine ?? undefined,
            image_url: r.image_url ?? undefined,
            _source: "local",
            _matched: matched,
          };
        });
        return new Response(
          JSON.stringify({ recipes: recipesOut, source: "local" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      // else: fall through to AI generation, but we may have a few local hits to merge later
      console.log(`local search found ${topLocal.length} matches, falling back to AI`);
    } catch (e) {
      console.error("local search failed, falling back to AI:", e);
    }
    // ============== END LOCAL-FIRST SEARCH ==============

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemAr = `أنت طاهي محترف يقترح وصفات سهلة وعملية. اكتب كل الردود بالعربية الفصحى البسيطة والمصطلحات الشعبية المصرية. استعمل الأدوات (function calling) لإرجاع النتائج. اجعل الخطوات قصيرة وواضحة (5-8 خطوات كحد أقصى لكل وصفة).`;
    const systemEn = `You are a friendly chef. Suggest practical recipes from the user's ingredients. Reply in English. Use the tool to return structured results. Keep steps short (5-8 max per recipe).`;

    const filterText = filters.length
      ? language === "ar"
        ? `الفلاتر المطلوبة: ${filters.join("، ")}.`
        : `Filters: ${filters.join(", ")}.`
      : "";
    const excludeText = exclude.length
      ? language === "ar"
        ? `يجب استبعاد: ${exclude.join("، ")}.`
        : `Exclude: ${exclude.join(", ")}.`
      : "";

    const userMsg =
      language === "ar"
        ? `المكونات المتوفرة عندي: ${ingredients.join("، ")}.\n${excludeText}\n${filterText}\nاقترح من 3 إلى 5 وصفات أقدر أعملها بالمكونات دي. حاول تستعمل أقل عدد من المكونات الناقصة.`
        : `My ingredients: ${ingredients.join(", ")}.\n${excludeText}\n${filterText}\nSuggest 3-5 recipes I can make. Minimize missing ingredients.`;

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
      return new Response(
        JSON.stringify({ error: "bad_response", message: "الرد غير مكتمل." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { recipes: unknown[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args", e);
      return new Response(
        JSON.stringify({ error: "parse_error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsed), {
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
