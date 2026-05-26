# Gercio — Real-time Kitchen Display

The kitchen-facing screen of **Gercio**, my restaurant-ordering SaaS. Orders placed by customers land here in real time so the kitchen and waiters can see them, track status, and keep service moving — no paper tickets, no manual relaying.

> **Live demo:** https://v0-real-time-kitchen-display.vercel.app

![status](https://img.shields.io/badge/status-production-success) ![next](https://img.shields.io/badge/Next.js-black) ![supabase](https://img.shields.io/badge/Supabase-realtime-3ecf8e)

---

## What it does

- **Live order board** — new orders appear instantly via Supabase Realtime (orders are created by an [n8n workflow](https://github.com/sancoders/n8n-automations) when a customer checks out).
- **Status tracking** — move an order through *received → preparing → ready*; the change syncs back to the customer app and waiter notifications.
- **Always-on display** — designed to run on a kitchen screen/tablet 24/7.

It's one piece of the Gercio system: customer web app (QR ordering) + AI assistant + Mercado Pago payments + Telegram staff alerts + this kitchen display, all glued together with n8n automations and a Supabase backend.

## Tech stack

- **Framework:** Next.js (App Router) · React · TypeScript
- **UI:** Tailwind CSS · shadcn/ui (Radix) · lucide-react
- **Data:** Supabase (PostgreSQL + Realtime) via `@supabase/ssr`
- **Deploy:** Vercel

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase project values
pnpm dev
```

Open http://localhost:3000.

## Environment variables

See [`.env.example`](.env.example). You'll need a Supabase project with an `orders` table; the anon key is safe for the client (protected by Row Level Security).

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Impact

Order processing went from ~5 minutes (manual relaying) to under 30 seconds, and the kitchen always has the live queue without anyone retyping anything.

---

*Built by [Santiago Cione](https://github.com/sancoders) — part of the [Gercio](https://gercio.site) SaaS.*
