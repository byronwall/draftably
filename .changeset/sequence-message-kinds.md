---
'draftably': minor
'@draftably/runtime': minor
'@draftably/editor': minor
---

Sequence diagrams say what each message is. An edge takes message=interaction, call, send, reply or outcome, answers= makes an edge a reply to the message it names, and an action line draws work one participant does as a box on its lifeline. The drawing adds a key for the marks in use. Headers are compact, a label between distant participants sits in one gap clear of every lifeline, and a long phase label wraps. `layout root sequence activations=on` draws an activation bar on a participant from each call to the reply that answers it; bars are off by default. Every sequence says under its drawing that rows show order, not elapsed time. A note on a message stays inside the phase band of that message. In the editor, Tab and Shift Tab insert a message, Alt with an up or down arrow moves one, a selected call shows its reply, and the Inspector has a switch for activation bars.
