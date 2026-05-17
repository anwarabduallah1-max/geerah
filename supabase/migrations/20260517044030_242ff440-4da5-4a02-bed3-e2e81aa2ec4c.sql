
-- Drop dev-only mock
DROP FUNCTION IF EXISTS public.dev_topup_wallet(numeric);

-- Payment invoices table
CREATE TABLE public.payment_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('topup','subscription','photo_slot')),
  purpose_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  amount_sar numeric NOT NULL CHECK (amount_sar > 0),
  np_invoice_id text,
  np_payment_id text,
  pay_address text,
  pay_amount numeric,
  pay_currency text NOT NULL DEFAULT 'usdttrc20',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirming','confirmed','failed','expired')),
  applied_at timestamptz,
  raw_ipn jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_invoices_user ON public.payment_invoices(user_id);
CREATE INDEX idx_payment_invoices_np_payment ON public.payment_invoices(np_payment_id);

ALTER TABLE public.payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invoices" ON public.payment_invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Inserts/updates only via service role (edge functions). No INSERT/UPDATE/DELETE policies for normal users.

CREATE TRIGGER trg_payment_invoices_updated
  BEFORE UPDATE ON public.payment_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Idempotent credit function: applies invoice once confirmed
CREATE OR REPLACE FUNCTION public.credit_wallet_for_invoice(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _plan text;
  _slots integer;
  _cost numeric;
BEGIN
  SELECT * INTO _inv FROM payment_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF _inv IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF _inv.status <> 'confirmed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_confirmed');
  END IF;
  IF _inv.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_applied', true);
  END IF;

  IF _inv.purpose = 'topup' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + _inv.amount_sar WHERE user_id = _inv.user_id;
    INSERT INTO wallet_transactions (user_id, amount, type, reference_id, note)
      VALUES (_inv.user_id, _inv.amount_sar, 'topup', _inv.id, 'شحن محفظة عبر USDT');

  ELSIF _inv.purpose = 'subscription' THEN
    _plan := COALESCE(_inv.purpose_payload->>'plan', 'normal');
    IF _plan NOT IN ('normal','business') THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_plan');
    END IF;
    UPDATE profiles SET
      subscription_type = _plan,
      subscription_expires_at = COALESCE(GREATEST(subscription_expires_at, now()), now()) + INTERVAL '30 days'
      WHERE user_id = _inv.user_id;
    INSERT INTO wallet_transactions (user_id, amount, type, reference_id, note)
      VALUES (_inv.user_id, -_inv.amount_sar, 'subscription', _inv.id, 'اشتراك ' || _plan || ' عبر USDT');

  ELSIF _inv.purpose = 'photo_slot' THEN
    _slots := COALESCE((_inv.purpose_payload->>'slots')::int, 1);
    UPDATE profiles SET photo_slots = LEAST(photo_slots + _slots, 8) WHERE user_id = _inv.user_id;
    INSERT INTO wallet_transactions (user_id, amount, type, reference_id, note)
      VALUES (_inv.user_id, -_inv.amount_sar, 'photo_slot', _inv.id, 'فتح خانات صور عبر USDT');
  END IF;

  UPDATE payment_invoices SET applied_at = now() WHERE id = p_invoice_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
