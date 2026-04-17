-- Add SEO fields to site_settings
alter table public.site_settings
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists keywords_ar text,
  add column if not exists keywords_en text,
  add column if not exists og_image_url text,
  add column if not exists twitter_handle text,
  add column if not exists site_url text;

-- Sensible defaults for the singleton row
update public.site_settings
set
  description_ar = coalesce(description_ar, 'موقع وصفات ذكي بالعربي والإنجليزي — اكتب المكونات اللي عندك في المطبخ، واحصل على وصفات قابلة للتنفيذ فوراً بالذكاء الاصطناعي. وصفات مصرية، عربية، صحية، اقتصادية، وسريعة.'),
  description_en = coalesce(description_en, 'AI-powered recipe finder. Type the ingredients you have and get cookable recipes in seconds — Egyptian, Arabic, healthy, budget, quick meals and more.'),
  keywords_ar = coalesce(keywords_ar, 'وصفات, طبخ, اكلات, وصفات سريعة, وصفات مصرية, وصفات عربية, وصفات صحية, اكلات اقتصادية, وصفات بالذكاء الاصطناعي, مكونات, طبخ بالموجود, وصفات بسيطة, اكل بيتي'),
  keywords_en = coalesce(keywords_en, 'recipes, cooking, AI recipes, what to cook, ingredient based recipes, easy recipes, healthy recipes, quick meals, dinner ideas, arabic recipes, egyptian recipes, recipe finder, meal planner')
where singleton = true;