# Follow-up requests

Source: `~/Projects/recipes-modern` (`src/app/list/KrogerSearchPopup.tsx`,
`src/server/api/routers/krogerRouter.ts` (`addToCart`, the search procedure via
`doKrogerSearch`), `src/server/krogerAuth.ts` (`krogerRequest`, the refresh-token exchange),
`src/server/db.ts`, the `KrogerPurchase` model).

Kind / layout / color strategy / theme: request path across three groups (Browser, Next.js
server, Kroger API) with the database outside them, `layered` right with one level of groups,
custom brand (`theme-color basil` on the Browser group and its members) / fieldnotes. Added in
round 5.

e1 (branch): "Show what happens when Kroger rejects the add."

- New node `failed` ("Mark purchase failed") in the server group; edges request → failed
  `rejected`, failed → db, and failed → list `error toast` (async).
- expects: keeps-order; near failed request 160.

e2 (relabel): "Label the arrows with what each call carries."

- Labels added to seven edges (item name, addToCart(sku), search terms, purchase row, refresh
  token, bearer + sku, status failed) and one async return (`list updated`).
- expects: still-shape \*; keeps-order (the round-5 relabel promise).
