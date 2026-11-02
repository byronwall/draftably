# Follow-up requests

Source: `~/Projects/image-annotator` (`app/src/routes/api/billing/checkout.ts`,
`app/src/lib/billing/stripe.ts` (`createCheckoutSession`, `constructStripeWebhookEvent`),
`app/src/routes/api/stripe/webhook.ts`, `app/src/lib/account/store.ts` (`upsertUserByEmail`,
`markCheckoutPaid`, `markCheckoutFailed`, the credit ledger and purchases)).

Kind / layout / color strategy / theme: payment lifecycle with two decisions, default layout (no
`layout` line), none / ink. Added in round 5.

e1 (relayout): "Make it read top to bottom."

- `layout root flow direction=down`.
- expects: reads-y along the main path.

e2 (branch): "Show the duplicate-event check and what happens when a payment expires or fails."

- New diamond `dup` ("Already processed?") between markCheckoutPaid and the ledger, with `yes` to
  Record ignored event; new node `failed` (markCheckoutFailed) from Signature valid? with
  `expired or failed`, and failed → Purchases `status failed`. c11 now runs mark → dup.
- expects: keeps-order; near failed signed 200; near dup mark 160.
