-- Fix: function search_path
create or replace function public.touch_site_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Fix: public bucket allows listing — restrict SELECT to admins only
-- Public URLs (via /storage/v1/object/public/...) still work because the bucket is public.
drop policy if exists "branding public read" on storage.objects;
create policy "branding admin select"
on storage.objects for select
to authenticated
using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));