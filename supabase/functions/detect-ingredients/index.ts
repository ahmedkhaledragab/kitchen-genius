// supabase/functions/detect-ingredients/index.ts
// Uses Lovable AI vision (gemini) to detect ingredients in a fridge photo.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  imageBase64?: string; // data URL or raw base64
  imageUrl?: string;
  language?: "ar" | "en";
}

const tool = {
  type: "function",
  function: {
    name: "list_ingredients",
    description: "List edible ingredients visible in the photo.",
    parameters: {
      type: "object",
      properties: {
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Lower-case single ingredient names.",
        },
      },
      required: ["ingredients"],
      additionalProperties: false,
    },
  },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: ReqBody = await req.json();
    const language = body.language === "en" ? "en" : "ar";
    if (!body.imageBase64 && !body.imageUrl) {
      return new Response(JSON.stringify({ error: "no_image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "no_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = body.imageBase64
      ? body.imageBase64.startsWith("data:")
        ? body.imageBase64
        : `data:image/jpeg;base64,${body.imageBase64}`
      : body.imageUrl!;

    const sys =
      language === "ar"
        ? "أنت محلل صور. حدد المكونات الغذائية الظاهرة في الصورة وأرجع أسماءها بالعربية بأسلوب مبسط (مفرد). استخدم الأداة المتاحة فقط."
        : "You are a vision analyst. Identify food ingredients in the image and return them as simple lower-case names using the provided tool only.";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  language === "ar"
                    ? "اكتب فقط أسماء المكونات الواضحة في الصورة."
                    : "List only the clearly visible ingredients.",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "list_ingredients" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429 || resp.status === 402) {
        return new Response(
          JSON.stringify({ error: resp.status === 429 ? "rate_limited" : "payment_required" }),
          { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await resp.text();
      console.error("vision error", resp.status, txt);
      return new Response(JSON.stringify({ error: "vision_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ ingredients: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(args);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
