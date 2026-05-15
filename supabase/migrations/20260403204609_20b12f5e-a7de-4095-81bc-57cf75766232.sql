ALTER TABLE public.items ADD COLUMN nafath_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.items ADD COLUMN security_deposit NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.items ADD COLUMN condition TEXT NOT NULL DEFAULT 'good';