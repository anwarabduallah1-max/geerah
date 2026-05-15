
# NOWPayments (USDT TRC20) Migration Plan

## ⚠️ Security notice — please act before we continue

You pasted your **NOWPayments API key and IPN secret in plain chat**. Treat both as compromised:

1. Log into NOWPayments → **rotate the API key** and **regenerate the IPN secret** before we wire them in.
2. I'll request them through Lovable's secure secrets form (`NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`) so they live only as backend env vars — never in source, never in the repo.
3. The payout wallet (`TAQza77…`) is configured **inside your NOWPayments dashboard**, not in the app. I won't hardcode it.

## What changes

### 1. Database (migration)
- New table `payment_invoices`:
  - `id`, `user_id`, `purpose` (`topup` | `subscription` | `photo_slot`), `purpose_payload` (jsonb — e.g. `{plan:'normal'}` or `{slots:2}`), `amount_sar` numeric, `np_invoice_id` text, `np_payment_id` text, `pay_address` text, `pay_amount` numeric, `pay_currency` text default `'usdttrc20'`, `status` text (`pending`|`confirming`|`confirmed`|`failed`|`expired`), `raw_ipn` jsonb, timestamps.
  - RLS: user reads own; only service role writes (edge functions use service key).
- Drop `dev_topup_wallet` (dev-only mock).
- New `credit_wallet_for_invoice(p_invoice_id uuid)` security-definer RPC: idempotent — if invoice `status='confirmed'` and not yet applied, credit wallet / apply subscription / add photo slots based on `purpose`, log to `wallet_transactions`, mark invoice as `applied_at`.

### 2. Edge functions
- `nowpayments-create-invoice` (JWT-protected):
  - Input: `{ purpose, amount_sar, payload? }`. Validates with zod.
  - Calls `POST https://api.nowpayments.io/v1/payment` with `price_amount`, `price_currency:'sar'`, `pay_currency:'usdttrc20'`, `order_id` = our invoice row id, `ipn_callback_url` pointing to the webhook.
  - Stores invoice + returns `{ pay_address, pay_amount, pay_currency, np_payment_id, qr_data }`.
- `nowpayments-ipn` (public, `verify_jwt=false`):
  - Reads raw body, computes HMAC-SHA512 with `NOWPAYMENTS_IPN_SECRET` over **sorted JSON keys** (per NOWPayments spec), compares to `x-nowpayments-sig` header — reject 401 on mismatch.
  - Maps `payment_status` → our status (`waiting`/`confirming` → `confirming`, `finished` → `confirmed`, `failed`/`expired`/`refunded` → `failed`).
  - On `confirmed`, calls `credit_wallet_for_invoice` (idempotent).
- `nowpayments-invoice-status` (JWT-protected): polls our row (and optionally NOWPayments) so the UI can show live state without waiting for IPN.

### 3. Frontend
- **Remove** `PaymentPlaceholderDialog.tsx` and the Ruul URL/button everywhere.
- New `CryptoPaymentDialog.tsx`:
  - Calls `nowpayments-create-invoice` on open.
  - Shows: amount in SAR, equivalent USDT amount, TRC20 address (copy button), QR (generated client-side from `pay_address` via `qrcode` lib), countdown to expiry, network = "TRC20 (Tron) — USDT only" warning.
  - Polls status every 8s; renders three states: **Pending** (waiting for transfer), **Confirmed** (success toast + close + invalidate wallet/profile queries), **Failed/Expired** (retry button).
- `WalletCard.tsx`: replace mock "شحن 50 ر.س" with "شحن المحفظة" → opens `CryptoPaymentDialog` with amount input (10–1000 SAR).
- `SubscriptionPage.tsx`: subscription tier + photo-slot buttons open `CryptoPaymentDialog` with the right `purpose`/amount instead of calling the wallet RPCs directly. Wallet RPCs (`purchase_subscription`, `purchase_photo_slots`) stay — they're now the post-payment fulfillment path (called via `credit_wallet_for_invoice`, not from the client).

### 4. Config
- Add to `supabase/config.toml`:
  ```toml
  [functions.nowpayments-ipn]
  verify_jwt = false
  ```

## Technical notes
- NOWPayments minimum invoice is ~$2 — I'll enforce a 10 SAR minimum client-side and show their min if their API rejects.
- Signature verification: NOWPayments requires the JSON to be re-serialized with **sorted keys** before HMAC — I'll implement that exactly, otherwise valid IPNs get rejected.
- All status transitions are server-side; the client never marks an invoice paid.
- `order_id` = our invoice UUID lets us look up the row from the IPN even if NOWPayments retries.

## What I need from you to proceed
1. **Confirm** you've rotated the API key + IPN secret in NOWPayments.
2. After you approve this plan, I'll prompt for `NOWPAYMENTS_API_KEY` and `NOWPAYMENTS_IPN_SECRET` via the secure secrets form.
3. Confirm the SAR top-up range (default I'll use: **10–1000 SAR**).

Shall I proceed?
