
-- Make item_id nullable in conversations to support direct chats
ALTER TABLE public.conversations ALTER COLUMN item_id DROP NOT NULL;
