
-- 1. Profiles updates
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_slots INTEGER NOT NULL DEFAULT 2;

-- 2. Ads
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  radius_km INTEGER NOT NULL DEFAULT 1 CHECK (radius_km IN (1,2,3)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT USING (is_active = true AND expires_at > now());
CREATE POLICY "Owners can view all their ads" ON public.ads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own ads" ON public.ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update their ads" ON public.ads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owners can delete their ads" ON public.ads FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Delivery jobs
CREATE TYPE delivery_job_status AS ENUM ('open','accepted','completed','cancelled');
CREATE TABLE IF NOT EXISTS public.delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  worker_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  dropoff_lat DOUBLE PRECISION,
  dropoff_lng DOUBLE PRECISION,
  price NUMERIC NOT NULL DEFAULT 0,
  commission_fee NUMERIC NOT NULL DEFAULT 0,
  status delivery_job_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery jobs" ON public.delivery_jobs FOR SELECT USING (true);
CREATE POLICY "Users can create jobs" ON public.delivery_jobs FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Involved users can update jobs" ON public.delivery_jobs FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = worker_id);
CREATE TRIGGER delivery_jobs_updated_at BEFORE UPDATE ON public.delivery_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Boosts
CREATE TABLE IF NOT EXISTS public.boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('profile','item','news')),
  target_id UUID NOT NULL,
  points_spent INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active boosts" ON public.boosts FOR SELECT USING (expires_at > now());
CREATE POLICY "Users insert own boosts" ON public.boosts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. RPC: complete_delivery_job
CREATE OR REPLACE FUNCTION public.complete_delivery_job(p_job_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _job RECORD;
  _commission NUMERIC;
BEGIN
  SELECT * INTO _job FROM delivery_jobs WHERE id = p_job_id;
  IF _job IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _job.worker_id IS NULL OR _job.worker_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_assigned');
  END IF;
  IF _job.status <> 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_status');
  END IF;
  _commission := ROUND(_job.price * 0.13, 2);
  UPDATE delivery_jobs SET status='completed', commission_fee=_commission, updated_at=now() WHERE id=p_job_id;
  UPDATE profiles SET wallet_balance = wallet_balance - _commission WHERE user_id = _job.worker_id;
  INSERT INTO wallet_transactions (user_id, amount, type, reference_id, note)
    VALUES (_job.worker_id, -_commission, 'commission', p_job_id, 'عمولة توصيل 13%');
  RETURN jsonb_build_object('success', true, 'commission', _commission);
END; $$;

-- 7. RPC: redeem_points_for_subscription
CREATE OR REPLACE FUNCTION public.redeem_points_for_subscription()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pts INTEGER; BEGIN
  SELECT points INTO _pts FROM profiles WHERE user_id = auth.uid();
  IF _pts < 1000 THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'needed', 1000, 'have', _pts); END IF;
  UPDATE profiles SET points = points - 1000,
    subscription_type = 'normal',
    subscription_expires_at = COALESCE(GREATEST(subscription_expires_at, now()), now()) + INTERVAL '30 days'
    WHERE user_id = auth.uid();
  RETURN jsonb_build_object('success', true);
END; $$;

-- 8. RPC: boost_target
CREATE OR REPLACE FUNCTION public.boost_target(p_target_type TEXT, p_target_id UUID, p_points INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pts INTEGER; BEGIN
  IF p_points < 10 THEN RETURN jsonb_build_object('success', false, 'error', 'min_10_points'); END IF;
  SELECT points INTO _pts FROM profiles WHERE user_id = auth.uid();
  IF _pts < p_points THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_points'); END IF;
  UPDATE profiles SET points = points - p_points WHERE user_id = auth.uid();
  INSERT INTO boosts (user_id, target_type, target_id, points_spent)
    VALUES (auth.uid(), p_target_type, p_target_id, p_points);
  RETURN jsonb_build_object('success', true);
END; $$;

-- 9. RPC: purchase_photo_slots
CREATE OR REPLACE FUNCTION public.purchase_photo_slots(p_slots INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal NUMERIC; _current INTEGER; _cost NUMERIC; BEGIN
  IF p_slots < 1 THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_amount'); END IF;
  SELECT wallet_balance, photo_slots INTO _bal, _current FROM profiles WHERE user_id = auth.uid();
  IF _current + p_slots > 8 THEN RETURN jsonb_build_object('success', false, 'error', 'max_slots'); END IF;
  _cost := p_slots * 9;
  IF _bal < _cost THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'needed', _cost); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - _cost, photo_slots = photo_slots + p_slots WHERE user_id = auth.uid();
  INSERT INTO wallet_transactions (user_id, amount, type, note) VALUES (auth.uid(), -_cost, 'photo_slot', 'فتح خانات صور إضافية');
  RETURN jsonb_build_object('success', true, 'cost', _cost, 'new_total', _current + p_slots);
END; $$;

-- 10. RPC: purchase_subscription
CREATE OR REPLACE FUNCTION public.purchase_subscription(p_plan TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal NUMERIC; _cost NUMERIC; BEGIN
  IF p_plan NOT IN ('normal','business') THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_plan'); END IF;
  _cost := CASE WHEN p_plan = 'normal' THEN 19 ELSE 49 END;
  SELECT wallet_balance INTO _bal FROM profiles WHERE user_id = auth.uid();
  IF _bal < _cost THEN RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance', 'needed', _cost); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - _cost,
    subscription_type = p_plan,
    subscription_expires_at = COALESCE(GREATEST(subscription_expires_at, now()), now()) + INTERVAL '30 days'
    WHERE user_id = auth.uid();
  INSERT INTO wallet_transactions (user_id, amount, type, note) VALUES (auth.uid(), -_cost, 'subscription', 'اشتراك ' || p_plan);
  RETURN jsonb_build_object('success', true, 'cost', _cost);
END; $$;

-- 11. Dev helper: top up wallet (placeholder until Ruul integration)
CREATE OR REPLACE FUNCTION public.dev_topup_wallet(p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount <= 0 OR p_amount > 1000 THEN RETURN jsonb_build_object('success', false, 'error', 'invalid_amount'); END IF;
  UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE user_id = auth.uid();
  INSERT INTO wallet_transactions (user_id, amount, type, note) VALUES (auth.uid(), p_amount, 'topup', 'شحن محفظة (تجريبي)');
  RETURN jsonb_build_object('success', true);
END; $$;
