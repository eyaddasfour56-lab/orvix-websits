# Full website and system handover guide

This guide defines the recommended transfer process for the complete ORVIX website and commerce system into buyer-controlled infrastructure. The signed sale agreement remains the final source of truth for the exact assets, rights, payment terms and support period included in the transaction.

## Recommended commercial scope

The sale package is designed as a complete project handover rather than a limited one-brand software licence. The buyer receives the agreed ORVIX website/system source snapshot, database migrations, deployment workflow and technical handover materials needed to operate and rebrand the project in buyer-controlled accounts.

### Included

- The agreed complete source-code snapshot
- The complete Supabase database migration set
- One buyer-controlled Vercel deployment workflow
- One buyer-controlled Supabase project workflow
- Storefront, checkout, accounts, secure tracking and admin system
- Initial brand, product, delivery and SEO configuration guidance
- Environment-variable mapping without production secrets
- Technical walkthrough and acceptance support as agreed in the sale terms

### Excluded unless separately agreed and legally transferable

- Existing ORVIX customer, order, analytics, chat or review data
- Private credentials, passwords, OTPs or production secrets
- Seller-owned Vercel, Supabase, Resend, Sent, Bosta or AI provider accounts
- Provider balances, message credits, courier contracts, domain verification or KYC approvals
- Social accounts, domains, trademarks or other brand assets not explicitly listed in the sale agreement
- New features or ongoing maintenance beyond the agreed handover/support period

## Handover sequence

1. **Commercial close**
   - Sign the full website/system sale and handover scope.
   - Confirm the final price, payment schedule and acceptance milestones.
   - Confirm the buyer's legal name, production brand, domain and authorised technical contact.

2. **Buyer-owned infrastructure**
   - Buyer creates or supplies the Vercel and Supabase projects used for the transferred deployment.
   - Buyer adds the required values from `.env.example` directly to those accounts.
   - No ORVIX production secret or customer record is copied into the buyer environment.

3. **Deployment and configuration**
   - Apply all `supabase/migrations/*.sql` files in filename order.
   - Deploy the agreed source snapshot to Vercel.
   - Configure brand name, logo, colours, official contacts, SEO and promotion in Admin → Brand & SEO.
   - Add products, variants, stock, delivery rules, discounts and policies.

4. **Acceptance and handover completion**
   - Complete the acceptance checklist below.
   - Record the final production handover date.
   - Deliver the agreed source snapshot and documentation after the contractual payment milestone is satisfied.
   - Begin any agreed post-handover support period.

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
- Product price, stock, variants and discount validation work.
- A test order can be placed without using real customer information.
- Admin can view and update the test order journey.
- Customer tracking identity checks work with the enabled verification method.
- Account registration, password reset, addresses, wishlist, returns and reviews are tested.
- Security headers are present and private routes are not indexed.
- `npm run lint`, TypeScript checking and `npm run build` pass.

## Secret-handling rules

- Never send passwords, OTPs, service keys or customer exports in chat or email.
- The buyer enters secrets directly into buyer-controlled provider dashboards.
- Rotate all temporary credentials immediately after acceptance.
- Use synthetic test data for demonstrations and delete it before launch.
