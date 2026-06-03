ALTER TABLE public.payment_invoices
  ADD COLUMN IF NOT EXISTS plisio_txn_id text,
  ADD COLUMN IF NOT EXISTS invoice_url text;

CREATE INDEX IF NOT EXISTS idx_payment_invoices_plisio_txn ON public.payment_invoices(plisio_txn_id);

-- Rename raw_ipn-friendly: keep raw_ipn for any provider callback payload (already exists).
-- Make pay_currency default to 'BTC' going forward (Plisio uses crypto cid; cards are handled inside Plisio's hosted page)
ALTER TABLE public.payment_invoices ALTER COLUMN pay_currency SET DEFAULT 'BTC';