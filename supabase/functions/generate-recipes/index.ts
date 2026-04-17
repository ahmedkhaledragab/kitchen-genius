// supabase/functions/generate-recipes/index.ts
// Calls Lovable AI Gateway with tool-calling for structured recipe output.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
