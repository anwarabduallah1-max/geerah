
-- =========================================================
-- 1. PROFILES: prevent privilege escalation + hide sensitive fields
-- =========================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_admin = (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid())
  AND wallet_balance = (SELECT wallet_balance FROM public.profiles WHERE user_id = auth.uid())
  AND points = (SELECT points FROM public.profiles WHERE user_id = auth.uid())
  AND tier = (SELECT tier FROM public.profiles WHERE user_id = auth.uid())
  AND trust_score = (SELECT trust_score FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_type = (SELECT subscription_type FROM public.profiles WHERE user_id = auth.uid())
  AND subscription_expires_at IS NOT DISTINCT FROM (SELECT subscription_expires_at FROM public.profiles WHERE user_id = auth.uid())
  AND photo_slots = (SELECT photo_slots FROM public.profiles WHERE user_id = auth.uid())
  AND is_verified = (SELECT is_verified FROM public.profiles WHERE user_id = auth.uid())
);

-- Column-level grants: hide sensitive fields from anon/authenticated.
-- Owner reads sensitive fields via get_my_profile() RPC below.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, username, avatar_url, bio, is_verified, trust_score, photo_slots, created_at, updated_at, location_lat, location_lng)
  ON public.profiles TO authenticated;
GRANT SELECT (id, user_id, username, avatar_url, bio, is_verified, trust_score, created_at)
  ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- RPC for the owner to read their own full profile (including sensitive fields).
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- =========================================================
-- 2. ADMIN_APPROVALS: restrict reads to admins / involved parties
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view approvals" ON public.admin_approvals;

CREATE POLICY "Admins and involved users view approvals"
ON public.admin_approvals
FOR SELECT
TO authenticated
USING (
  auth.uid() = approver_id
  OR auth.uid() = candidate_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

REVOKE SELECT ON public.admin_approvals FROM anon;

-- =========================================================
-- 3. DELIVERY_JOBS: restrict full row to involved + admins
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view delivery jobs" ON public.delivery_jobs;

CREATE POLICY "Involved users view delivery jobs"
ON public.delivery_jobs
FOR SELECT
TO authenticated
USING (
  auth.uid() = requester_id
  OR auth.uid() = worker_id
  OR status = 'open'
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

REVOKE SELECT ON public.delivery_jobs FROM anon;
-- Hide pickup/dropoff coordinates from open-job browsing (only involved parties get them via separate RPC if needed)
REVOKE SELECT (pickup_lat, pickup_lng, dropoff_lat, dropoff_lng) ON public.delivery_jobs FROM authenticated;
GRANT SELECT (pickup_lat, pickup_lng, dropoff_lat, dropoff_lng) ON public.delivery_jobs TO service_role;

-- =========================================================
-- 4. DELIVERY_REQUESTS: restrict reads to involved + admins
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view delivery requests" ON public.delivery_requests;

CREATE POLICY "Involved users view delivery requests"
ON public.delivery_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = requester_id
  OR auth.uid() = courier_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

REVOKE SELECT ON public.delivery_requests FROM anon;

-- =========================================================
-- 5. EMERGENCY_ALERTS: restrict to owner + admins
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view alerts" ON public.emergency_alerts;

CREATE POLICY "Owner and admins view alerts"
ON public.emergency_alerts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);

REVOKE SELECT ON public.emergency_alerts FROM anon;

-- =========================================================
-- 6. POINTS_LEDGER: server-side writes only
-- =========================================================
DROP POLICY IF EXISTS "System can insert points" ON public.points_ledger;
REVOKE INSERT ON public.points_ledger FROM anon, authenticated;
GRANT INSERT ON public.points_ledger TO service_role;

-- =========================================================
-- 7. WALLET_TRANSACTIONS: server-side writes only
-- =========================================================
DROP POLICY IF EXISTS "Users insert own transactions" ON public.wallet_transactions;
REVOKE INSERT ON public.wallet_transactions FROM anon, authenticated;
GRANT INSERT ON public.wallet_transactions TO service_role;

-- =========================================================
-- 8. SECURITY_EVENTS: require authentication
-- =========================================================
DROP POLICY IF EXISTS "Anyone can log a security event" ON public.security_events;

CREATE POLICY "Authenticated users can log security events"
ON public.security_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

REVOKE INSERT ON public.security_events FROM anon;

-- =========================================================
-- 9. SECURITY DEFINER functions: remove anon execute
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.admin_decide_candidate(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.boost_target(text, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_send_emergency(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_delivery_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.credit_wallet_for_invoice(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_for_invoice(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.redeem_points_for_subscription() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_subscription(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.perform_handshake(uuid, uuid, handshake_method, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_photo_slots(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_admin_status(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_decide_candidate(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.boost_target(text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_emergency(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_points_for_subscription() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_subscription(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_handshake(uuid, uuid, handshake_method, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_photo_slots(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_status(uuid) TO authenticated;

-- =========================================================
-- 10. STORAGE: prevent bucket listing/enumeration
-- =========================================================
DROP POLICY IF EXISTS "Public can list item-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can list jeera-box-images" ON storage.objects;
-- Public READ of individual objects via direct URL remains; LIST requires authenticated.
CREATE POLICY "Authenticated can list item-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated can list jeera-box-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'jeera-box-images');
