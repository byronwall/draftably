# Follow-up requests

Source: `~/Projects/tasks-trpc` (`src/trpc/react.tsx`, `src/middleware.ts`,
`src/app/api/trpc/[trpc]`, `src/app/api/identity/[...nextauth]`, `src/server/api/routers/*`,
`src/server/auth/config.ts`, `prisma/schema.prisma`, `src/stores/*`).

Kind / layout / color strategy / theme: request path through nested groups (API routes and
Routers inside the Next.js server), compound-flow, by group (one family per group, members
`auto`) / ink.

e1 (grow): "Show where sign-in goes: NextAuth talks to GitHub and stores accounts in Prisma."

- New node `github` outside every group; edges nextauth → github and nextauth → prisma.
- expects: keeps-order; near github nextauth 160.
