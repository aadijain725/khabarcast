# KhabarCast

Waitlist landing page for KhabarCast — AI audio briefings for your reading list.

Stack: Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Convex · Vercel.

---

## Run Locally

### First-time setup

```bash
npm install
```

Initialize Convex (interactive — opens browser for login, creates a project):

```bash
npx convex dev
```

This writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local` automatically. Leave this process running in one terminal — it watches `convex/` for changes and pushes them to your dev deployment.

### Development

In a second terminal:

```bash
npm run dev
```

Open http://localhost:3000.

## Connect Convex

- `convex/schema.ts` defines the `waitlist` table with a `by_email` index.
- `convex/waitlist.ts` exports the `joinWaitlist` mutation (validation + dedup).
- `app/providers.tsx` wires the `ConvexReactClient` using `NEXT_PUBLIC_CONVEX_URL`.
- `components/WaitlistForm.tsx` calls the mutation via `useMutation(api.waitlist.joinWaitlist)`.

While `npx convex dev` is running, edits to anything in `convex/` push automatically. The `convex/_generated/` folder is regenerated on push — do not edit it by hand.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` (auto), Vercel prod | Client-side URL of the Convex deployment. |
| `CONVEX_DEPLOY_KEY` | Vercel prod only | Lets Vercel's build step deploy the Convex backend in CI. Generate under Convex dashboard → Settings → Deploy Keys. |

See `.env.local.example` for reference.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_CONVEX_URL` — your production Convex URL.
   - `CONVEX_DEPLOY_KEY` — production deploy key from Convex.
4. Override the Build Command in Vercel project settings:
   ```
   npx convex deploy --cmd 'next build'
   ```
   This deploys Convex backend changes before building Next.js.
5. Deploy.

## Project Layout

```
app/
  layout.tsx        Root layout — Fraunces + DM Sans + ConvexClientProvider
  providers.tsx     Client-side ConvexReactClient wrapper
  page.tsx          Landing page (server component)
  globals.css       Tailwind v4 + theme tokens
components/
  WaitlistForm.tsx  Client component — form state, validation, mutation call
convex/
  schema.ts         waitlist table
  waitlist.ts       joinWaitlist mutation
```
