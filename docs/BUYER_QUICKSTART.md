# ORVIX buyer quickstart

This quickstart is for a buyer receiving a licensed or transferred source-code snapshot. It is intentionally written for a fresh buyer-controlled environment and does not require access to ORVIX production data or provider accounts.

## 1. Create buyer-owned infrastructure

Create the buyer's own:

- GitHub repository or approved source-code destination
- Vercel project
- Supabase project
- Production domain
- Provider accounts required for email, SMS, courier or AI features

Do not copy ORVIX production credentials, customer records, order data, analytics exports or provider balances.

## 2. Configure the application

1. Install Node.js 22.
2. Copy `.env.example` to `.env.local`.
3. Add credentials for the buyer-controlled Supabase and Vercel environment.
4. Install dependencies with `npm install`.
5. Apply `supabase/migrations/*.sql` in filename order to the fresh Supabase project.
6. Run `npm run dev`.

## 3. Use the in-app launch workflow

After signing in as an authorised admin, open:

- `/admin/setup` — six-step setup and launch wizard
- `/admin/settings` — white-label identity, colours, contacts, SEO and promotion controls
- `/admin/products` — catalogue, variants and inventory
- `/admin/commerce` — checkout and commerce controls
- `/admin/fulfillment` — order journey and delivery operations
- `/admin/email-preview` — transactional message previews
- `/admin/handover` — buyer transfer and acceptance center
- `/admin/buyer-preview` — synthetic read-only buyer demo

## 4. Complete acceptance with synthetic data

Before production launch verify:

- Storefront loads correctly on desktop and mobile.
- English and Arabic presentation works as expected.
- Buyer branding and SEO are correct.
- Product prices, variants, stock and discounts behave correctly.
- A synthetic test order completes with the expected totals.
- Admin can process the synthetic order journey.
- Secure order tracking works with the enabled verification method.
- Account registration and password recovery work.
- Returns, reviews and wishlist flows are available where enabled.
- Private/admin routes are not indexed.
- No production secret is exposed in client-side code.

Then run:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

## 5. Activate optional providers

The platform is integration-ready, but the buyer controls each provider account.

| Capability | Provider | Buyer action |
| --- | --- | --- |
| Transactional email | Resend | Verify buyer domain/sender and add buyer API key |
| SMS / phone OTP | Sent | Complete onboarding, fund account and configure approved sender |
| Courier dispatch/tracking | Bosta | Add buyer merchant credentials and webhook configuration |
| AI assistance | Vercel AI Gateway / OpenAI | Add buyer provider key and select supported model |

## 6. Production cutover

- Replace every synthetic test record that should not remain in production.
- Rotate temporary credentials used during acceptance.
- Add the production domain to Vercel and relevant provider allowlists.
- Confirm final environment variables in Production, not only Preview.
- Run a final storefront, checkout, tracking and admin smoke test.
- Record the handover date and agreed support-period start date.
