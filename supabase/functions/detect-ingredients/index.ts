// supabase/functions/detect-ingredients/index.ts
// Uses Lovable AI vision (gemini) to detect ingredients in a fridge photo.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      _feature: "detect_ingredients",
      _default_limit: 5,
    });
    if (usageError) {
      console.error("usage rpc error", usageError);
      return new Response(JSON.stringify({ error: "usage_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const u = usage as { allowed: boolean; reason?: string; used?: number; limit?: number };
    if (!u.allowed) {
      const msg = u.reason === "banned"
        ? "حسابك موقوف. تواصل مع الإدارة."
        : u.reason === "limit_reached"
          ? `وصلت لحد رفع الصور اليومي (${u.used}/${u.limit}).`
          : "غير مسموح.";
      return new Response(
        JSON.stringify({ error: u.reason ?? "blocked", message: msg, used: u.used, limit: u.limit }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
