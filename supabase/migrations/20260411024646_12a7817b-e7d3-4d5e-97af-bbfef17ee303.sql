
-- Create handshake method enum
CREATE TYPE public.handshake_method AS ENUM ('qr_code', 'manual');

-- Create handshakes table
CREATE TABLE public.handshakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  method handshake_method NOT NULL DEFAULT 'qr_code',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  pair_count INTEGER NOT NULL DEFAULT 1,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (provider_id != requester_id)
);

-- Enable RLS
ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;

-- Users can view their own handshakes
CREATE POLICY "Users can view their handshakes"
ON public.handshakes FOR SELECT
TO authenticated
USING (auth.uid() = provider_id OR auth.uid() = requester_id);

-- Users can create handshakes as requester
CREATE POLICY "Users can create handshakes"
ON public.handshakes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

-- Create index for cooldown lookups
CREATE INDEX idx_handshakes_pair ON public.handshakes (provider_id, requester_id, created_at DESC);

-- Function to check 24h cooldown and calculate points
CREATE OR REPLACE FUNCTION public.perform_handshake(
  _provider_id UUID,
  _requester_id UUID,
  _method handshake_method,
  _lat DOUBLE PRECISION DEFAULT NULL,
  _lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_handshake TIMESTAMP WITH TIME ZONE;
  _pair_total INTEGER;
  _points INTEGER;
  _is_first BOOLEAN;
BEGIN
  -- Check cooldown: last handshake between this pair in either direction
  SELECT MAX(created_at) INTO _last_handshake
  FROM handshakes
  WHERE (provider_id = _provider_id AND requester_id = _requester_id)
     OR (provider_id = _requester_id AND requester_id = _provider_id);

  IF _last_handshake IS NOT NULL AND _last_handshake > now() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', 'cooldown', 'next_available', _last_handshake + INTERVAL '24 hours');
  END IF;

  -- Count previous handshakes between this pair
  SELECT COUNT(*) INTO _pair_total
  FROM handshakes
  WHERE (provider_id = _provider_id AND requester_id = _requester_id)
     OR (provider_id = _requester_id AND requester_id = _provider_id);

  _is_first := (_pair_total = 0);

  -- Calculate points based on method and diversity
  IF _method = 'qr_code' THEN
    _points := 10;
  ELSE
    _points := 3;
  END IF;

  -- First-ever handshake bonus: +5
  IF _is_first THEN
    _points := _points + 5;
  END IF;

  -- Diminishing returns for repeated pairs (after 3rd handshake)
  IF _pair_total >= 3 THEN
    _points := GREATEST(1, _points / 2);
  END IF;
  IF _pair_total >= 10 THEN
    _points := 1;
  END IF;

  -- Insert handshake record
  INSERT INTO handshakes (provider_id, requester_id, method, points_awarded, pair_count, location_lat, location_lng)
  VALUES (_provider_id, _requester_id, _method, _points, _pair_total + 1, _lat, _lng);

  -- Award points to both users
  UPDATE profiles SET trust_score = trust_score + _points WHERE user_id = _provider_id;
  UPDATE profiles SET trust_score = trust_score + _points WHERE user_id = _requester_id;

  RETURN jsonb_build_object(
    'success', true,
    'points', _points,
    'is_first', _is_first,
    'pair_count', _pair_total + 1,
    'method', _method
  );
END;
$$;
