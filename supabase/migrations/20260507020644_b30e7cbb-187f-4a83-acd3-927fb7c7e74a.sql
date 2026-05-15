
ALTER TABLE public.news 
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;

CREATE POLICY "Admins can delete approvals"
ON public.admin_approvals
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_admin = true)
);
