# Diagram recipes

Start with a complete diagram, then change it to explain your system. Each recipe answers one question and includes an edit to try.

| Your question                        | Start with                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Which services handle a request?     | [A request through a system](/docs/recipes#request-through-a-system)         |
| Who owns each step?                  | [A process with handoffs](/docs/recipes#process-with-handoffs)               |
| Which message happens next?          | [An exchange between services](/docs/recipes#exchange-between-services)      |
| What does this change add or remove? | [A proposed architecture change](/docs/recipes#proposed-architecture-change) |
| Which lines of code cause this?      | [Code behind a step](/docs/recipes#code-behind-a-step)                       |

Edit the source beside each drawing. Select **Playground** to keep working, or copy the source into a `.draft` file.
Edits made on this docs page are temporary. [Save, share and reopen](#saving) explains how to keep them.

## Request through a system

Use a flow for dependencies and data movement. Here, a web request enters an API, which queues work for a worker.
The group marks the service boundary. The dashed line marks queued work.

```draft
diagram "Background jobs" version=1
subtitle "The API queues work; a worker stores the result"
node web "Web app" color=blue
group service "Job service" color=slate
node api "API" in=service
node queue "Job queue" in=service shape=pill color=amber
node worker "Worker" in=service
node db "Results" shape=pill color=teal
edge request web -> api "submit job"
edge enqueue api -> queue "enqueue" kind=async
edge consume queue -> worker "consume"
edge persist worker -> db "save result"
layout root flow direction=right
layout service row
legend blue "Caller"
legend amber "Buffered work"
legend teal "Stored results"
legend line dashed "Queued delivery"
```

**Try it:** add `count=3` to the worker's `node` line. The worker gains a count badge without adding three boxes.
Use counts when identical instances do the same job. Use separate nodes when their roles differ.

Keep IDs such as `api` and `worker` stable when you rename labels. Edges and layout rules refer to IDs.
Use an edge label for the action or data crossing a boundary, such as “enqueue” or “job payload”.

For a larger example, open [RAG assistant](/play?example=rag-assistant) or [Web app components](/play?example=web-app-components).

## Process with handoffs

Use lanes when ownership matters more than physical structure. Each group is an owner; each node is a step.
Connections put the steps in order across all lanes.

```draft
diagram "Review a change" version=1
subtitle "Each handoff has an owner"
group author "Author"
group automation "Automation"
group reviewer "Reviewer"
node submit "Submit change" in=author
node checks "Run checks" in=automation
node review "Review change" in=reviewer
node approve "Approve" in=reviewer
edge e1 submit -> checks
edge e2 checks -> review "checks pass"
edge e3 review -> approve "ready"
layout root lanes
```

This drawing follows a passing change. Add a rejection path when that outcome matters to your reader.

**Try it:** add `direction=down` to the layout line. Owners become columns, and the process runs down the page.
Every node must belong to a lane. Read [Swim lanes](#swim-lanes) for placement limits.

For a branching process, open [Support triage](/play?example=support-triage).

## Exchange between services

Use a sequence when one participant sends several messages. Nodes name participants; edge lines set message order.
The vertical gaps show order, not elapsed time.

```draft
diagram "Create a job" version=1
subtitle "Accept the request before the background work finishes"
node client "Client" color=blue
node api "API"
node queue "Queue" color=amber
node worker "Worker"
edge submit client -> api "POST /jobs"
edge enqueue api -> queue "job payload"
edge accepted api -> client "202 + job ID" kind=async
edge deliver queue -> worker "deliver job"
edge process worker -> worker "process job"
edge done worker -> queue "acknowledge" kind=async
layout root sequence
legend blue "Caller"
legend amber "Buffered work"
legend line dashed "Response or acknowledgement"
```

**Try it:** move the `accepted` edge below `process`. The response now appears after processing.
This changes the story even though the same participants remain connected.

The dashed style does not model scheduling or enforce protocol rules.
Use the legend to state what dashed lines mean in your diagram.

See [Sequence diagrams](#sequence-diagrams) for participant groups, phase bands and notes on messages.

## Proposed architecture change

Use change marks to explain a review. This proposal replaces a direct call with a queue.
The API and worker remain as context; marked edges show which path changes.

```draft
diagram "Queue background work" version=1
subtitle "Replace the direct call with queued delivery"
node api "API"
node worker "Worker"
+node queue "Job queue" shape=pill
-edge direct api -> worker "run job"
+edge enqueue api -> queue "enqueue"
+edge consume queue -> worker "consume"
layout root flow direction=right
```

**Try it:** add `compare "Before" "After"` on its own line. The drawing becomes two aligned panels.
Change marks supply their own colors and legend, so readers can distinguish additions from removals.

If you already have both files, generate the marks. First install the CLI in your project with `pnpm add -D draftably`:

```sh
pnpm exec draftably compare before.draft after.draft > change.draft
pnpm exec draftably check change.draft
pnpm exec draftably open change.draft
```

See [Install](#install) for other ways to run the CLI.
Use the same IDs in both files so the comparison can match objects.
Read [Change marks](#change-marks) for attributes that a Before panel cannot reconstruct.

## Code behind a step

Use a code node when the code itself is the explanation. Name the lines that matter with `range`,
and point lines and notes at them. Here, a report runs a query that reads the orders table twice.

```draft
diagram "Why the orders report is slow" version=1
subtitle "The query reads the orders table twice"
node report "Orders report" color=blue
node sql "orders_report.sql" shape=code lang=sql numbers=on <<SQL
  SELECT c.name, totals.amount, counts.n
  FROM customers AS c
    JOIN (SELECT customer_id, SUM(total) AS amount
          FROM orders GROUP BY customer_id) AS totals
      ON totals.customer_id = c.id
    JOIN (SELECT customer_id, COUNT(*) AS n
          FROM orders GROUP BY customer_id) AS counts
      ON counts.customer_id = c.id
  WHERE c.active;
SQL
range sql.scan1 lines=3-5 color=red "scan 1"
range sql.scan2 match="COUNT\\(\\*\\)" span=3 color=red "scan 2"
edge runs report -> sql.scan1 "runs"
note "Each scan reads every order row." near=sql side=below
```

**Try it:** change `lines=3-5` to `lines=6-8`. The band, its label and the end of the line move to
the second scan. The box and the layout stay the same.

The body between `<<SQL` and `SQL` is verbatim, so paste code in with no escapes. `lang=` colors it
in the theme's colors. A `match=` range finds its line by pattern, so it stays on the right lines
when the code above it changes.

To keep the code in its own file, replace the body with `src=` and a line range. The CLI and
`draftably open` read the file, and every export carries the code inline:

```text
node sql "orders_report.sql" shape=code src="queries/orders_report.sql#L12-L20" numbers=on
```

For a larger example, open [Why the orders report is slow](/play?example=code-review). Read
[Code](#code) for every option.

## Refine and share a recipe

Save your chosen recipe as `architecture.draft`. The commands below use the CLI installed in your project.

1. Choose the question the diagram must answer. Put its answer in a short subtitle.
2. Replace the labels and connections. Keep one level of detail within each diagram.
3. Check the file before tuning its layout: `pnpm exec draftably check architecture.draft`.
4. Inspect the drawing. Check line labels, crossings, ownership and reading order.
5. Open it with `pnpm exec draftably open architecture.draft` to adjust placement.
6. Export with `pnpm exec draftably inspect architecture.draft --svg > architecture.svg`.

For placement problems, start with [Layout engines](#layout-engines) and [Layout tools](#layout-tools).
For larger starting points, browse [Examples](#examples). For publishing, choose an [embedding route](#embed).
