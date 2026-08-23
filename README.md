# ORVIX Commerce Platform

ORVIX is a production-deployed, white-label-ready commerce and operations platform for modern retail brands in Egypt. It combines a bilingual storefront, checkout, customer accounts, secure order tracking, fulfillment tooling, analytics, and a configurable admin operating system in one Next.js application.

- Live storefront: <https://orvix-websits.vercel.app>
- Buyer-facing system overview: <https://orvix-websits.vercel.app/system-preview>
- Handover guide: [`docs/WHITE_LABEL_HANDOVER.md`](docs/WHITE_LABEL_HANDOVER.md)
- Due-diligence summary: [`docs/BUYER_DUE_DILIGENCE.md`](docs/BUYER_DUE_DILIGENCE.md)

## Platform scope

### Storefront and conversion

- English and Arabic storefront experience
- Product variants, stock states, live pricing, promotions, discount codes, wishlist, and cart
- Cash on Delivery and InstaPay-on-delivery checkout flows
- Delivery-area pricing and Bosta-ready location/shipping integration
- Product SEO, structured data, sitemap, robots, manifest, and social sharing metadata

### Customer experience

- Registration, login, password reset, and account confirmation
- Saved addresses and cross-device wishlist sync
- Order history, reorder, cancellation, returns, and verified reviews with photos
- Secure tracking identity checks with email and SMS OTP-ready workflows
- Customer support inbox and chat experience

### Admin operating system

- Orders, fulfillment journeys, pre-orders, labels, and courier actions
- Products, inventory, discounts, reviews, waitlists, customers, and exports
- Cashflow, analytics, attribution, recovery, risk, and feature controls
- Editable brand identity, colours, contacts, SEO, and live promotion settings
- Role-aware admin permissions, audit trails, and optional two-factor verification

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Postgres, Auth, Storage, Row Level Security, and scheduled jobs
- Vercel deployment
- Optional integrations: Resend, Sent, Bosta, Vercel AI Gateway/OpenAI

## Local setup

1. Install Node.js 22.
2. Copy `.env.example` to `.env.local` and add credentials for a buyer-controlled environment.
3. Install dependencies with `npm install`.
4. Apply the SQL files in `supabase/migrations` in filename order to a new Supabase project.
5. Run `npm run dev` and open <http://localhost:3000>.

Never copy production secrets or customer data into a buyer environment.

## Verification

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

## Deployment and provider activation

The core storefront and database require buyer-owned Vercel and Supabase projects. Transactional email, SMS, courier dispatch, and AI features are optional integrations and activate only after the buyer supplies verified provider accounts, approved senders, and environment variables.

## Rights

All rights are reserved. Access to this repository does not grant a licence, redistribution right, resale right, or ownership transfer. Commercial rights begin only under a signed agreement that defines the included deployment, support period, and licence scope.
