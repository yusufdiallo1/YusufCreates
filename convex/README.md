# convex/

Convex backend: schema, queries, mutations, actions and HTTP routes.

- `schema.ts` — table definitions and indexes.
- `auth.ts` — `@convex-dev/auth` configuration.
- `http.ts` — HTTP router; mounts auth callback routes.
- `leads.ts` — example query/mutation pair.
- `_generated/` — created by `npx convex dev`. Do not edit by hand.

Run `npx convex dev` to push these functions and generate types.
