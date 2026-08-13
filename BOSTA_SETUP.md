# ORVIX Bosta shipping setup

The website lets an admin choose one or more confirmed orders and create one Bosta pickup for exactly those orders. Complete these one-time steps before using the dashboard panel.

## 1. Add the database columns

1. Open the ORVIX project in Supabase.
2. Open **SQL Editor** and create a new query.
3. Copy and run everything from:
   `supabase/migrations/202608130001_bosta_shipping.sql`
4. Confirm that the query finishes successfully.

The migration is safe to run again because every column and index uses `if not exists`.

## 2. Add the server secrets in Vercel

In **Project Settings → Environment Variables**, add these variables for Production, Preview, and Development:

- `BOSTA_API_KEY`: the Read/Write API key from the Bosta business dashboard.
- `BOSTA_WEBHOOK_SECRET`: a new long random secret used only to authenticate Bosta status updates.

Never prefix either variable with `NEXT_PUBLIC_`, and never commit their values to GitHub.

## 3. Configure the webhook in Bosta

In **Bosta Dashboard → Settings → API Integration → Set Up Your Webhook**, enter:

- URL: `https://YOUR-DOMAIN/api/bosta/webhook`
- Authorization key name: `Authorization`
- Authorization value: `Bearer YOUR_BOSTA_WEBHOOK_SECRET`

The secret after `Bearer` must exactly match the `BOSTA_WEBHOOK_SECRET` value in Vercel.

## 4. Confirm the pickup location

The Bosta account must have at least one pickup location. The default location is selected automatically in the ORVIX dashboard, and it can be changed before sending a batch.

## How the workflow works

1. Checkout records Bosta's exact city and district for every new order.
2. In `/admin`, change a verified order to **Confirmed**.
3. The Bosta panel lists every confirmed, address-ready order with a checkbox.
4. Select any orders you want to send. A pickup can contain a single order or several orders.
5. Choose the pickup date and press **Send selected + request pickup**.
6. The server creates one delivery per selected order, saves every tracking number, and creates one pickup containing those tracking numbers.
7. Press **Print Bosta AWB(s)** to open the combined Bosta PDF.
8. Bosta webhook updates automatically move orders through shipped, out for delivery, delivered, canceled, or exception states.

For every delivery, Bosta COD is set to `delivery_fee` only. The product amount remains assigned to ORVIX's InstaPay flow.
