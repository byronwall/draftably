# Hosted diagram workspaces

**Outcome:** Open one account gallery to recover work. Open one workspace to read a set of diagrams in context.

**Primary flow:** Draw “Checkout architecture” through MCP → open All diagrams → select it alongside “Order events” → add both to Checkout → put the architecture first → reopen Checkout from a script.

## Feature scope

```text
Hosted account
├── Planned gallery
│   ├── Recent thumbnails, title search and unplaced filter
│   └── Open latest source or add selection to a workspace
└── Planned workspace
    ├── Named, ordered cards with stable links
    └── Add, reorder and remove through web, REST or MCP
```

On desktop, a workspace opens with its name, diagram count and a responsive grid. Show each entire diagram fitted to its card, with readable title and an action to open full size. Narrow screens preserve reading order in one column. Include Move earlier/later alongside drag. An empty workspace offers “Add from All diagrams.” A gallery search with zero matches offers “Clear search.” The same item can appear in several workspaces and still has one gallery entry.

## Behavior

| Action | Expected result |
| --- | --- |
| Render successfully while signed in | Capture under the account, including cache hits. Return the durable diagram ID alongside the existing result. |
| Revise with an explicit diagram ID | Update its current source and preview in every placement. A stale revision returns a conflict. |
| Generate a long image URL, validate, or convert source | Preserve the existing transient operation. An explicit save promotes the result. |
| Remove a card or delete a workspace | Other placements and the gallery entry survive. Public shares continue to address their published snapshot. |
| Open a private thumbnail | Authenticate the request. Keep private source out of public image URLs and shared response caches. |

## Decisions and boundaries

**Appetite:** One account, one gallery and one ordered workspace view. Use titles, thumbnails and ordering to test whether people can read related diagrams together.

**Key decision:** Give diagrams stable account-owned IDs and model placements as references. A folder-only solution forces a choice of home for diagrams used by two projects. A freeform board adds coordinates, zoom and mobile navigation before we know which relationships need them.

**First proof:** Reunite a checkout overview, a workflow and a sequence diagram in a local fixture. **Try:** In a second client session, find the overview, place it first in two sets, revise it and remove one placement. **Observe:** Record the two workspace manifests and the gallery before and after. **Decide:** Ship ordered cards if both sets are legible in reading order. If a reviewer needs to say “compare the diagram on the left with the one below it,” prototype spatial placement before fixing the contract.

**Open choices:** Confirm capture defaults and the meaning of placement in the [implementation plan](implementation-plan.md#open-decisions).
