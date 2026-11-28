# Find every hosted diagram and bring related ones together

## My read

A diagram should survive the conversation that produced it. Someone who drew a checkout architecture through MCP on Friday should be able to find it on Monday, add the password-reset sequence from a REST script, and open both together without retrieving either conversation. A workspace gives the set a purpose. **All diagrams** gives the account a memory even when the author never chose a workspace.

## What matters most

- Start from either surface and continue from the other using the same diagram and workspace IDs.
- Recognize past work by its thumbnail and title. Open the editable source to continue it.
- Place the same diagram in two workspaces when it explains both. A revision should reach both views.

## Boundaries

The proposed audience is the signed-in owner. Public links already have a different audience. Rendering for a preview, publishing a link and organizing private work need separate, understandable consequences. Deleting a workspace should leave its diagrams findable.

“Ever made” includes a historical expectation. Existing authenticated shares can establish some past activity. Locally stored files, source embedded in long URLs and anonymous shares can be imported when the user supplies them. A history screen should report its coverage date and imported count. It cannot infer who created an anonymous diagram from its title, content or IP address.

## What seems settled

The user asked for hosted API and MCP support, a way to place diagrams together, and a single place to see them. Whether placement needs free coordinates and which successful operations automatically save a diagram remain product choices. The [shape](shape-brief.md) makes provisional calls on both so the [plan](implementation-plan.md) can be evaluated end to end.

## Next step after confirmation

Run the checkout reunion exercise with a fresh client session. Success means finding, arranging and reopening prior work using only the account and the names a person remembers.
