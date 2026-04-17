-- Site settings (singleton row)
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  site_name_ar text not null default 'من اللي عندك؟',
  site_name_en text not null default 'What''s in your kitchen?',
  tagline_ar text default 'اكتب اللي عندك في المطبخ، وإحنا نطلعلك وصفات تقدر تعملها فوراً 🍳',
  tagline_en text default 'Type what you have, get cookable recipes in seconds 🍳',
  logo_url text,
  favicon_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Insert the single row if not exists
insert into public.site_settings (singleton)
select true
where not exists (select 1 from public.site_settings);

-- RLS: anyone (incl. anon) can read; only admins can update
alter table public.site_settings enable row level security;

drop policy if exists "anyone reads site_settings" on public.site_settings;
create policy "anyone reads site_settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "admins update site_settings" on public.site_settings;
create policy "admins update site_settings"
on public.site_settings for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.touch_site_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_site_settings on public.site_settings;
create trigger trg_touch_site_settings
before update on public.site_settings
for each row execute function public.touch_site_settings();

-- Branding storage bucket (public for logo/favicon serving)
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Storage policies: public read, admin-only write
drop policy if exists "branding public read" on storage.objects;
create policy "branding public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'branding');

drop policy if exists "branding admin insert" on storage.objects;
create policy "branding admin insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "branding admin update" on storage.objects;
create policy "branding admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "branding admin delete" on storage.objects;
create policy "branding admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));