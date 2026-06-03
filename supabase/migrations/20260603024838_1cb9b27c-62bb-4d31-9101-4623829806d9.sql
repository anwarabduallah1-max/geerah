-- Attach the missing trigger so every new auth user gets a profile row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: create profile rows for any existing users that don't have one
INSERT INTO public.profiles (user_id, username)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'username', 'جار جديد')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;