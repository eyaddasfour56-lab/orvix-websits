# Buyer due-diligence summary

## Asset type

This is a working software platform and production demo, not a claim of an established revenue-generating business. Financial performance, inventory ownership, brand rights, and customer data are outside the white-label licence unless a signed agreement explicitly includes them.

## Verifiable technical inventory

- 50+ storefront, customer, and admin route screens
- 90+ server/API route handlers
- 20+ ordered Supabase migrations
- Next.js 16, React 19, TypeScript, Supabase, and Vercel
- English and Arabic customer experience
- Production deployment with buyer-testable storefront, product, checkout, account, and tracking paths

Counts describe repository route files and are not presented as unique commercial features.

## Implemented modules

| Area | Included capabilities |
| --- | --- |
| Storefront | Products, variants, stock states, pricing, wishlist, cart, promotions, discounts, policies, SEO |
| Checkout | Contact and delivery details, delivery pricing, COD/InstaPay-on-delivery selection, order summary |
| Customer account | Registration, login, password reset, profile, saved addresses, wishlist sync, orders, reorder |
| Customer operations | Secure tracking, cancellation, editing, returns, verified reviews, support inbox |
| Admin | Orders, fulfillment, products, inventory, customers, cashflow, analytics, discounts, reviews, waitlist |
| Controls | Brand/SEO settings, feature flags, recovery, risk, exports, audit history, role-aware permissions |
| Integrations | Supabase, Vercel, Resend-ready email, Sent-ready SMS, Bosta-ready shipping, optional AI |

## Verification evidence

Run the following against the exact source snapshot delivered to the buyer:

```bash
npm install
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

The live deployment can be reviewed through `/system-preview`, which links to the storefront, product, checkout, tracking, account, and admin entry surfaces.

## Known provider dependencies

Transactional email, SMS, courier dispatch, and AI features depend on buyer-owned third-party accounts. Code availability does not guarantee third-party approval, geographic coverage, message delivery, courier service, account balance, or vendor uptime. Feature flags remain disabled until the related account is ready.

## Data and privacy boundary

The licensed deployment starts with a clean buyer-controlled database. ORVIX production customer records, phone numbers, email addresses, orders, chats, analytics events, reviews, and secrets must not be transferred into a white-label environment.

## Suggested buyer review

1. Review the live customer journey.
2. Review this repository with a technical adviser under an NDA if requested.
3. Confirm the commercial licence scope and excluded assets.
4. Confirm provider availability for the buyer's country and use case.
5. Complete the handover acceptance checklist before final sign-off.
