# White-label handover guide

This guide defines the recommended handover for one buyer-controlled production deployment. The signed commercial agreement remains the final source of truth.

## Recommended commercial scope

The recommended offer is a non-exclusive, perpetual licence for one production brand. It gives the buyer the right to operate and customise one deployed store while the seller retains the underlying platform and the right to maintain or license it elsewhere.

### Included

- A source-code snapshot for the licensed version
- The complete Supabase database migration set
- One buyer-controlled Vercel deployment
- One buyer-controlled Supabase project
- Initial brand, product, delivery, and SEO configuration
- Environment-variable mapping without production secrets
- A technical walkthrough and 30 calendar days of handover and defect support

### Excluded unless separately agreed

- The ORVIX name, trademarks, logo, domain, social accounts, or brand content
- Existing ORVIX customer, order, analytics, chat, or review data
- Seller-owned Vercel, Supabase, Resend, Sent, Bosta, or AI provider accounts
- Provider balances, message credits, courier contracts, domain verification, or KYC approvals
- Source redistribution, sublicensing, template resale, or deployment for a second brand
- New features or ongoing maintenance after the support period

## Handover sequence

1. **Commercial close**
   - Sign the licence and implementation scope.
   - Use an agreed protected payment method.
   - Confirm the buyer's legal name, production brand, domain, and authorised contact.

2. **Buyer-owned infrastructure**
   - Buyer creates Vercel and Supabase projects.
   - Buyer adds the required values from `.env.example` directly to those accounts.
   - No ORVIX production secret or customer record is copied.

3. **Deployment and configuration**
   - Apply all `supabase/migrations/*.sql` files in filename order.
   - Deploy the licensed source snapshot to Vercel.
   - Configure brand name, logo, colours, official contacts, SEO, and promotion in Admin → Brand & SEO.
   - Add products, variants, stock, delivery rules, discounts, and policies.

4. **Acceptance and support**
   - Complete the acceptance checklist below.
   - Record the production handover date.
   - Begin the agreed support period.

## Provider activation matrix

| Capability | Required provider | Core platform status | Buyer action |
| --- | --- | --- | --- |
| Storefront, accounts, orders, reviews | Supabase | Implemented | Create project and apply migrations |
| Hosting and deployment | Vercel | Implemented | Import repository and add environment variables |
| Transactional email | Resend | Integration-ready | Verify domain and sender, then add API key |
| SMS and phone OTP | Sent | Integration-ready and feature-gated | Complete onboarding, fund account, and enable flags |
| Courier dispatch and tracking | Bosta | Integration-ready | Add merchant API key and webhook secret |
| AI admin/customer assistance | Vercel AI Gateway or OpenAI | Optional | Add a supported provider key and model |

## Acceptance checklist

- Storefront loads on desktop and mobile.
- English and Arabic switching works.
- Buyer branding and official contact details are visible.
- Product price, stock, variants, and discount validation work.
- A test order can be placed without using real customer information.
- Admin can view and update the test order journey.
- Customer tracking identity checks work with the enabled verification method.
- Account registration, password reset, addresses, wishlist, returns, and reviews are tested.
- Security headers are present and private routes are not indexed.
- `npm run lint`, TypeScript checking, and `npm run build` pass.

## Secret-handling rules

- Never send passwords, OTPs, service keys, or customer exports in chat or email.
- The buyer enters secrets directly into buyer-controlled provider dashboards.
- Rotate all temporary credentials immediately after acceptance.
- Use synthetic test data for demonstrations and delete it before launch.
