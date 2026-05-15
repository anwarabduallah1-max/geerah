
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create enums
CREATE TYPE public.price_type AS ENUM ('free', 'borrow', 'for_sale');
CREATE TYPE public.item_status AS ENUM ('available', 'busy');
CREATE TYPE public.request_status AS ENUM ('pending', 'accepted', 'delivered');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  trust_score INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items table
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  image_url TEXT,
  price_type public.price_type NOT NULL DEFAULT 'free',
  price_value NUMERIC(10,2) DEFAULT 0,
  status public.item_status NOT NULL DEFAULT 'available',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items are viewable by everyone" ON public.items FOR SELECT USING (true);
CREATE POLICY "Users can insert their own items" ON public.items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own items" ON public.items FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own items" ON public.items FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Requests table
CREATE TABLE public.requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view requests they are involved in" ON public.requests FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = courier_id OR auth.uid() IN (SELECT owner_id FROM public.items WHERE id = item_id));
CREATE POLICY "Authenticated users can create requests" ON public.requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Involved users can update requests" ON public.requests FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = courier_id OR auth.uid() IN (SELECT owner_id FROM public.items WHERE id = item_id));
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- News table
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  zone_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News is viewable by everyone" ON public.news FOR SELECT USING (true);
CREATE POLICY "Users can insert their own news" ON public.news FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own news" ON public.news FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own news" ON public.news FOR DELETE USING (auth.uid() = author_id);
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'جار جديد'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
