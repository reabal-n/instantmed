-- The unified consult checkout uses services.type = 'consult' for the
-- canonical services.slug = 'consult' row.

ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'consult';
