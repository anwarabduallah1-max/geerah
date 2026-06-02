
-- Conversation read tracking
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buyer_last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS seller_last_read_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Bump conversation.updated_at when a new message lands
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation ON public.messages;
CREATE TRIGGER trg_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- Mark conversation as read by current user
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _c RECORD; BEGIN
  SELECT * INTO _c FROM public.conversations WHERE id = p_conversation_id;
  IF _c IS NULL THEN RETURN false; END IF;
  IF _c.buyer_id = auth.uid() THEN
    UPDATE public.conversations SET buyer_last_read_at = now() WHERE id = p_conversation_id;
  ELSIF _c.seller_id = auth.uid() THEN
    UPDATE public.conversations SET seller_last_read_at = now() WHERE id = p_conversation_id;
  ELSE
    RETURN false;
  END IF;
  RETURN true;
END; $$;

-- Approve / reject item requests (owner only)
CREATE OR REPLACE FUNCTION public.decide_item_request(p_request_id UUID, p_approve BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _req RECORD; _owner UUID; BEGIN
  SELECT r.*, i.owner_id AS owner_id INTO _req
  FROM public.requests r JOIN public.items i ON i.id = r.item_id
  WHERE r.id = p_request_id;
  IF _req IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _req.owner_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF p_approve THEN
    UPDATE public.requests SET status='approved', updated_at=now() WHERE id = p_request_id;
    UPDATE public.items SET status='busy', updated_at=now() WHERE id = _req.item_id;
  ELSE
    UPDATE public.requests SET status='rejected', updated_at=now() WHERE id = p_request_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END; $$;

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.requests REPLICA IDENTITY FULL;
ALTER TABLE public.emergency_alerts REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_jobs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.requests; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
