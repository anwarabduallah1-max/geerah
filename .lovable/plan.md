# Jeerah Business & Economy System

Large multi-system feature. I'll scaffold DB + UI in coherent layers, reusing existing glassmorphism/dark style and spring animations.

## 1. Database (Supabase migration)

**Update `profiles`**
- `subscription_type` text default `'none'` (none | normal | business)
- `subscription_expires_at` timestamptz nullable
- `wallet_balance` numeric default 0
- `photo_slots` int default 2
- (`points` already exists)

**New tables**
- `ads` — `user_id`, `title`, `content`, `image_url`, `location_lat/lng`, `radius_km` (1|2|3), `is_active`, `expires_at`, timestamps. RLS: public SELECT active ads; owner all.
- `delivery_jobs` — `requester_id`, `worker_id` nullable, `pickup_lat/lng`, `dropoff_lat/lng`, `title`, `description`, `price` numeric, `commission_fee` numeric (computed 13%), `status` enum (open|accepted|completed|cancelled). RLS: public SELECT open; involved users update.
- `wallet_transactions` — `user_id`, `amount` numeric (+/-), `type` (topup|commission|payout|boost|subscription|photo_slot), `reference_id`, `note`, created_at. RLS: user reads own.
- `boosts` — `user_id`, `target_type` (profile|item|news), `target_id`, `points_spent`, `expires_at`. RLS: public SELECT active; owner insert.

**RPC functions** (security definer)
- `complete_delivery_job(job_id)` — sets status completed, debits 13% commission from worker wallet, logs transaction.
- `redeem_points_for_subscription()` — costs e.g. 1000 points → 30 days normal sub.
- `boost_target(target_type, target_id, points)` — debits points, inserts boost (24h).
- `purchase_photo_slots(slots)` — debits wallet, increments `photo_slots`.
- `purchase_subscription(plan)` — debits wallet, sets sub + expiry.

## 2. UI Pages & Components

**New pages**
- `src/pages/SubscriptionPage.tsx` — three tier cards (None / Normal 19SAR / Business 49SAR), Ruul placeholder button, "Redeem with points" button, photo-slots upsell card.
- `src/pages/BusinessHubPage.tsx` — tabs: "متجري" (business listings, gated), "التوصيل" (delivery jobs marketplace, free), "الإعلانات" (manage ads), "المحفظة" (wallet + transactions).

**New components**
- `src/components/WalletCard.tsx` — balance, top-up placeholder, commission summary.
- `src/components/AdComposer.tsx` — title/content/image/radius selector → inserts into `ads` at user location.
- `src/components/AdPopup.tsx` — glass modal shown once per session if user within ad radius.
- `src/components/BoostButton.tsx` — small action to spend points to boost.
- `src/components/MapAdsLayer.tsx` — renders ad pins on Leaflet (custom megaphone icon).

**Routing & nav**
- Add routes `/subscription` and `/business` in `App.tsx`.
- Add a "الأعمال" entry in `BottomNav` or a side entry in Profile menu (preserve 5-tab layout — put Business in Profile page side actions and Subscription as well).

## 3. Map Ads + Popup
- `MapPage` mounts `MapAdsLayer` and `AdPopup` checker (queries active ads, computes distance from user location, opens popup for nearest unseen ad — sessionStorage dedupe).

## 4. Boosts in feeds
- `useItems` and news feed query: order by `boosted desc, created_at desc` using a left join view, or simpler: client-side merge with active boosts list.

## 5. Visual / Motion
- Reuse `glass-strong`, `shadow-soft-lg`, `rounded-3xl`, `spring.tap`, `tapScale`, `EASE_PREMIUM`, `gpu` classes.
- Subscription cards use gradient borders for Business tier.
- Ad popup uses scale-in spring + backdrop blur.

## Technical notes
- Commission = round(price * 0.13, 2) computed in RPC, not trusted from client.
- Ads expire 7 days from creation by default.
- Boost duration: 24h.
- Photo slots price: 9 SAR per extra slot, max 8.
- All payment buttons currently open a placeholder dialog with "سيتم التوجيه إلى Ruul قريبًا" + a mock "محاكاة الدفع" button (dev only) that calls the RPC.

## Out of scope (placeholder only)
- Real Ruul redirect URL — left as TODO env var `RUUL_CHECKOUT_URL`.
- Real top-up flow — mock button credits wallet for now.

Shall I proceed?
