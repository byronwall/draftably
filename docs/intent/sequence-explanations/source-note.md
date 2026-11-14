# Source note

Source: https://notes.apps.byroni.us/docs/cmvrilcoj001eq71yn95kkx73
Title: Sequence diagrams: why they fail and how to make them better
Captured: 2026-10-30. Block IDs removed; note text preserved.

The short answer: sequence diagrams often become bad because we use a chronological notation as though it were already an explanation.

A sequence diagram gives you participants, messages, and ordering. It does not automatically give you a main idea, meaningful phases, a clear level of detail, or a useful reading path. You can draw every arrow correctly and still leave the reader doing most of the explanatory work.

Your example is a good illustration. It is clean, orderly, and not overloaded. But the first impression is “four large boxes connected by some exchanges,” rather than “the app delegates verification, the auth service checks the stored credential, and a result comes back.”

Here’s the detailed breakdown. Most recommendations below are design judgments, not universal UML rules.

## 1. The fundamental problem: the drawing records events, but the reader needs an explanation

Consider three different questions:

- What happens after someone presses Sign in?
- Which component checks the password?
- Why is sign-in slow?

They concern the same system, but they need different emphasis.

The first benefits from a short narrative. The second needs clear responsibility boundaries. The third needs measured durations, waiting, and overlap.

A generic sequence diagram often attempts to answer all three with the same arrows. Consequently, it is too technical for an overview, too vague for a protocol specification, and not quantitative enough for performance analysis.

Before drawing, finish this sentence: “After reading this, someone should understand \_\_\_.”

For your image, I would choose: “The web app asks the auth service to verify credentials; the auth service consults the user store and returns the result.”

That sentence is the spine. Other details should support it, not compete with it.

## 2. What your diagram already gets right

This is not a spaghetti diagram:

- Four participants is manageable.
- Their order is sensible. Every inter-participant exchange goes between neighbors.
- Labels are short enough to scan.
- Arrows generally have enough separation.
- The success path is uncomplicated.
- The absence of activation bars and elaborate branch frames keeps it approachable.

I would not “fix” it by adding database cylinders, icons everywhere, more colors, or every possible failure case. Those would add visual machinery before improving the explanation.

The strongest improvements are hierarchy, scope, and message treatment.

## 3. The participant headers are visually louder than the story

The User, Auth service, and User store blocks have substantial size and saturated fills. They dominate the image, although the important information is below them.

This reverses the hierarchy: the cast gets the strongest treatment; the plot gets thin gray lines.

I would:

- Make participant headers substantially shorter.
- Keep their labels prominent, but reduce their filled area.
- Use quieter neutral styling unless color communicates a specific distinction.
- Give the meaningful phases stronger labels than incidental implementation details.
- Keep lifelines visibly subordinate to messages.

The different shapes also invite interpretation: is the rounded User different from the rectangular services because it is a person? Probably. Is the white Web app special because it is a boundary, or simply because it received different styling? The image does not say.

That is not necessarily wrong. But every conspicuous visual distinction creates an expectation of meaning. Either make that meaning useful or simplify the distinction.

## 4. Labels interrupt the very lines you are asking people to follow

In your image, message text sits inside gaps in the arrow shafts. For example, “submit email + password” splits its arrow into a short segment before the text and another segment ending at the receiver.

That is readable here. But it makes the reader reconstruct the connection through the label. As labels get longer, the arrow starts looking like two disconnected marks with text between them.

My default would be:

- A continuous message line.
- Its label just above it.
- A small, consistent gap between label and line.
- An unmistakable arrowhead with clear space around it.
- Enough row height for wrapped labels.

This is a preference, not a prohibition on inline labels. Inline labels can work when short and consistently handled. The problem is a renderer that keeps expanding the gap until very little arrow remains.

There is a related problem in your “check password hash” step: the little return-shaped hook reads as somewhat detached from its lifeline. The outgoing part of the self-message is not visually obvious.

Either draw a complete, clearly attached self-call or show a compact local-action annotation on the Auth service lifeline. If the point is simply “this work happens here,” the annotation may explain it better than a tiny plumbing symbol.

## 5. The layout gives every step roughly the same narrative weight

The seven events are evenly distributed down a large field of whitespace. But they do not represent seven equally important ideas.

They form three phases:

- Submit the request.
- Verify the identity.
- Return the result.

Those phases are currently something the reader has to infer.

I would use three gently separated horizontal sections, with short labels in a left gutter or at the start of each section. Slightly more space between phases, slightly less within a phase.

That converts a seven-step recall task into a three-part explanation with details underneath.

Do not make the bands so colorful or heavily bordered that they become the next distraction. And do not make ordinary narrative phases look like formal UML conditional or parallel fragments. “Verify identity” is a section label, not an execution operator.

## 6. Too much whitespace can be just as harmful as too little

Whitespace helps separate ideas. But empty distance is not inherently clarity.

In a sequence diagram, additional width lengthens every message. Additional height separates cause from response and makes readers travel back to identify the relevant participant.

Your image is generous enough that it will likely be scaled down in a blog, document, or chat. Once that happens, the labels get smaller while the empty areas remain proportionally large.

I would design at the intended reading size, not create a large canvas and hope downscaling makes it fit.

For example, for a desktop article, test the diagram at approximately 900–1100 pixels wide with readable text at that actual size. Those are starting points, not standards. For a phone, a horizontally scrollable diagram with pinned participant labels may be more honest than shrinking four columns into illegibility.

The goal is not minimum area. It is minimum unnecessary eye travel while preserving readable labels and grouping.

## 7. Many sequence diagrams mix levels of abstraction

Your image contains:

- A human action: submit credentials.
- Service interactions: verify credentials and load user.
- A local computation: check a password hash.
- A returned artifact: session token.
- A user-visible outcome: signed in.

That mixture can be useful, but it needs to be deliberate.

For a product explanation, the local hash check may be unnecessary. For an engineering responsibility review, it is probably the most important detail. For a wire-level protocol review, “Web app” and “signed in” are not specific enough.

Do not force every layer into one view. Choose a dominant level and make exceptions only when they explain something important.

Also distinguish the human from the software acting on their behalf. A human does not receive a network token in the same sense that a browser or client does. Your simplified User lane is fine for an overview, but a detailed protocol diagram would need more precise participant boundaries.

That is a scope issue, not evidence that the underlying implementation is wrong.

## 8. A happy-path diagram needs an honest title, not every possible error branch

“Sign-in sequence” sounds comprehensive. The drawing actually shows one successful path.

I would change the title to “Successful password sign-in” and add a compact scope note:

“Valid credentials; error paths omitted. Vertical spacing indicates order, not elapsed time.”

Now missing-user, invalid-password, unavailable-store, and other scenarios are not silently implied to be covered.

The solution is not to insert all of them into this image. A large collection of nested alternatives can turn an understandable story into a visual program that is harder to read than the code.

Use a separate companion diagram for a failure when that failure teaches something important. Keep the participant order consistent between success and failure so readers can compare them without mentally rearranging the system.

A small, local success/failure alternative is often useful inside one diagram. The warning sign is not the existence of a branch; it is having to repeatedly leave the main reading path, remember several conditions, and work out which later messages belong to which alternative. If branch coverage is the actual question, a decision table or activity diagram may be the better primary view.

## 9. Ordering participants is a real design decision

Participant order determines how far eyes and arrows travel. Declaration order in a source file is not necessarily a good layout.

A reasonable default is to put frequent collaborators near each other, preserve meaningful boundaries, and avoid gratuitous long messages across unrelated lanes.

There is empirical support for taking this seriously. Nickerson and Corter’s 2009 study compared two orders of the same five-component sequence diagram. For one topology-inference question, 6 of 28 participants answered correctly with the original order, versus 17 of 25 with the reordered version. That is evidence for that particular task, not a claim that reordering universally triples comprehension. [Study: Clarity from Confusion, 2009](https://www.tc.columbia.edu/faculty/jec34/faculty-profile/files/ntendedinteractionstodesigninformationsystems..pdf)

Your example already has a good neighboring order. I would preserve it.

For more complex diagrams, do not optimize message length so aggressively that related diagrams keep changing lane order. Stability across a set of diagrams can be worth a slightly longer arrow.

## 10. Sequence diagrams can imply more certainty than they actually contain

This is where attractive diagrams become misleading.

Position lower on the page is not automatically proof that every earlier-looking event everywhere else has completed. Concurrent and asynchronous interactions need explicit semantics. Nor does twice as much vertical space mean twice as much time.

Similarly:

- A dashed return is not a measured duration.
- An activation bar is not CPU utilization.
- An asynchronous send is not proof that work completed.
- A response is not necessarily proof of durable persistence.
- A local operation is not necessarily a network round trip.

Use formal distinctions when the audience needs them, and supply a small legend when readers may not know them. If the diagram is intentionally informal, say so rather than borrowing formal-looking notation and relying on guesswork.

Do not simplify away blocking, retries, acknowledgment, or concurrency when those are the reason the diagram exists. The underlying ordering and timing distinctions are part of the formal interaction semantics, not just cosmetic conventions. [OMG UML 2.5.1, December 2017, chapter 17](https://www.omg.org/spec/UML/2.5.1/PDF)

## 11. Return messages should earn their space

Some returns communicate an essential fact. Others simply say “the call finished,” which readers already inferred.

In your image:

- “User record” explains what the Auth service gets from the store.
- “Session token” explains the returned result of verification.
- “Signed in” reads more like the user-visible outcome than a technical reply.

I would retain the first two in an engineering-oriented version. I would treat the final item as either an explicitly labeled response or a compact outcome annotation, depending on the intended abstraction.

I would not remove returns merely to reduce arrow count. The right question is whether removing one hides an important value, wait, ownership transfer, or result.

## 12. My concrete redesign of this exact image

I would keep the same four participants and preserve the information in all seven steps.

Title:  
“Successful sign-in”

Subtitle:  
“The app delegates credential verification to the auth service.”

Phase 1 — Submit

1. Step 1: User sends email and password to Web app.

1. Step 2: Web app requests credential verification from Auth service.

Phase 2 — Verify

1. Step 3: Auth service requests the user from User store.

1. Step 4: User store returns the user record.

1. Step 5: Auth service checks the password hash, shown as a clearly attached local action.

Phase 3 — Return

1. Step 6: Auth service returns the session token to Web app.

1. Step 7: Web app presents the signed-in result to User.

Visual treatment:

- Smaller, consistent participant headers.
- Quiet lifelines.
- Continuous arrows with labels above.
- Dashed returns retained, with a brief legend if needed.
- Three restrained phase divisions.
- Compact spacing inside each phase.
- More space at phase boundaries.
- One accent for the verification phase, if emphasis is useful.
- A small success-path and not-to-scale note.

I would not add cookie handling, token storage, or session issuance details unless verified. The current image does not tell us those things.

For a nontechnical audience, I would create a separate three-phase overview rather than cram that overview and this detailed exchange into the same picture.

## 13. Sometimes the right improvement is a different diagram

Use a sequence diagram when the question really is “who communicates with whom, and in what ordering?”

Use something else when the primary question differs:

- Responsibilities and dependencies: component or architecture diagram.
- Decisions and alternative paths: flowchart or activity diagram.
- Valid states and transitions: state machine.
- Where latency goes: trace waterfall or timing diagram with measured durations.
- A person’s experience: journey or storyboard.
- Collaborators and a few ordered interactions: a communication-style diagram with numbered exchanges.

Simon Brown’s C4 guidance explicitly treats dynamic diagrams as selective tools for interesting or complicated interactions, not something every feature needs. It supports both sequence-style and free-form collaboration-style presentations. [C4 dynamic diagrams](https://c4model.com/diagrams/dynamic)

For this sign-in example, the sequence is useful if responsibility matters. If the sole message is “submit, verify, sign in,” a three-panel explanation may be better.

## 14. What I would change in a sequence-diagram renderer

If you’re thinking about this as a diagram-tool design problem, I would prioritize these capabilities:

First: semantic structure.  
Participants, messages, local actions, responses, phases, alternatives, and parallel regions should be distinct concepts. Do not represent everything as arbitrary boxes and routed edges and expect the renderer to recover the story.

Second: label-aware layout.  
Measure text first. Reserve room for arrowheads. Wrap labels intentionally. Make row height respond to content. Do not let one long label inflate every column.

Third: phase-aware spacing.  
Support authored phase labels and sensible grouping. Do not invent phases solely because several arrows happen to be close together.

Fourth: stable participant ordering.  
Allow suggestions, but preserve explicit order and keep comparisons aligned. Reordering should be reviewable, not an invisible optimization.

Fifth: meaningful focus.  
Selecting a message could highlight sender, receiver, and its related response while dimming unrelated context. Collapsing a phase should show that events are hidden, not make the sequence appear complete. Keep its important participants, inputs, and result understandable. Do not hide the main explanation behind a hover that disappears in an export.

This is also why zoom alone is insufficient. Sharp and Rountev’s sequence-diagram exploration research describes how zooming can push both ends of a long message, or the boundary of a surrounding fragment, out of view. Their work motivates keeping context while filtering and exploring, rather than merely enlarging a huge diagram; it is prototype research, not proof of a universal comprehension benefit. [Interactive Exploration of UML Sequence Diagrams, 2005](https://citeseerx.ist.psu.edu/document?doi=f7309c396b3bc0ff17cd0f8acf30a89e1eef26c2&repid=rep1&type=pdf)

Sixth: useful warnings.  
Flag clipped labels, ambiguous self-loops, excessive width at the chosen export size, missing notation legends where relevant, and deep branch nesting. Treat participant count or diagram height as prompts for review, not automatic correctness failures.

Finally: evaluate with questions, not just geometry.  
Can someone quickly identify who checks the password, what the store returns, and what the diagram deliberately leaves out? Can they follow a failure variant without relearning lane positions?

A diagram with less area or fewer crossings is not automatically a better explanation.

My overall recommendation: keep the sequence notation, but treat the result as an edited explanation rather than a formatted log. For your example, smaller headers, continuous arrows, three named phases, a clearly attached local action, and an honest success-path title would improve it much more than a new visual theme.
