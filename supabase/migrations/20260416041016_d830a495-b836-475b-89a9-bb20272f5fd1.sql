
-- Add tier and points to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'regular', 'business')),
ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Jeera Box: community free items gallery
CREATE TABLE public.jeera_box (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  category text NOT NULL DEFAULT 'أخرى',
  claimed_by uuid,
  claimed_at timestamp with time zone,
  location_lat double precision,
  location_lng double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.jeera_box ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view jeera_box" ON public.jeera_box FOR SELECT USING (true);
CREATE POLICY "Authenticated users can donate" ON public.jeera_box FOR INSERT TO authenticated WITH CHECK (auth.uid() = donor_id);
CREATE POLICY "Donors can update their items" ON public.jeera_box FOR UPDATE TO authenticated USING (auth.uid() = donor_id);
CREATE POLICY "Authenticated users can claim" ON public.jeera_box FOR UPDATE TO authenticated USING (claimed_by IS NULL OR auth.uid() = donor_id);
CREATE POLICY "Donors can delete their items" ON public.jeera_box FOR DELETE TO authenticated USING (auth.uid() = donor_id);
CREATE TRIGGER update_jeera_box_updated_at BEFORE UPDATE ON public.jeera_box FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Emergency alerts table
CREATE TABLE public.emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL DEFAULT 'طلب مساعدة عاجل',
  location_lat double precision,
  location_lng double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view alerts" ON public.emergency_alerts FOR SELECT USING (true);
CREATE POLICY "Users can create alerts" ON public.emergency_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin approvals: 5 approvals needed for admin status
CREATE TABLE public.admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  approver_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, approver_id)
);
ALTER TABLE public.admin_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approvals" ON public.admin_approvals FOR SELECT USING (true);
CREATE POLICY "Authenticated users can approve" ON public.admin_approvals FOR INSERT TO authenticated WITH CHECK (auth.uid() = approver_id AND auth.uid() != candidate_id);

-- Delivery requests: neighborhood gig system
CREATE TYPE public.delivery_status AS ENUM ('open', 'accepted', 'picked_up', 'delivered', 'cancelled');
CREATE TABLE public.delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  courier_id uuid,
  title text NOT NULL,
  description text,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  fee numeric NOT NULL DEFAULT 0,
  payment_link text,
  status public.delivery_status NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view delivery requests" ON public.delivery_requests FOR SELECT USING (true);
CREATE POLICY "Users can create delivery requests" ON public.delivery_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Involved users can update delivery" ON public.delivery_requests FOR UPDATE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = courier_id);
CREATE TRIGGER update_delivery_updated_at BEFORE UPDATE ON public.delivery_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Points ledger
CREATE TABLE public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their points" ON public.points_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert points" ON public.points_ledger FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to check emergency alert limit
CREATE OR REPLACE FUNCTION public.can_send_emergency(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _count integer;
  _limit integer;
BEGIN
  SELECT tier INTO _tier FROM profiles WHERE user_id = p_user_id;
  _limit := CASE WHEN _tier IN ('regular', 'business') THEN 2 ELSE 1 END;
  
  SELECT COUNT(*) INTO _count
  FROM emergency_alerts
  WHERE user_id = p_user_id AND created_at > now() - INTERVAL '24 hours';
  
  IF _count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', _limit);
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _limit - _count, 'limit', _limit);
END;
$$;

-- Function to check and grant admin status
CREATE OR REPLACE FUNCTION public.check_admin_status(p_candidate_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  SELECT COUNT(*) INTO _count FROM admin_approvals WHERE candidate_id = p_candidate_id;
  IF _count >= 5 THEN
    UPDATE profiles SET is_admin = true WHERE user_id = p_candidate_id;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;
