
UPDATE public.recipes SET image_url = '/recipes/' || id || '.png'
WHERE id IN (
  'ecaded0c-336e-46cf-854c-464be2b25a26',
  '052c4405-628d-418a-93d9-15f44014edaf',
  '47d67471-3290-4b5b-b297-86d2ec390afb',
  '8c64a97e-35d5-4d7d-8d35-f3ade141d64c',
  '23aac9f3-74af-4cd2-b949-a13504b5cb38',
  'effa3af8-1ba7-49b9-b604-ca209d95a784',
  'f3264513-cfe5-45b9-bf37-fba0a8549274',
  'f6e8d0e0-d948-42d9-8b87-a2bc8675d896',
  'b636d6f4-55fb-4adf-af84-d5ac036e39d4',
  '51e56e5c-a58e-4175-8410-26452910617a',
  '5623ffdb-3e42-4be0-b05d-df8edfca1d66',
  '9ed5fae7-c201-4269-b579-264a6f317e4d'
);
