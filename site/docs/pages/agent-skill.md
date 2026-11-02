# Agent skill

draftably ships a skill that teaches coding agents such as Claude Code, Codex and Cursor to write
`.draft` files, check them, pick a layout and hand the result to you in the editor. The agent edits
text, so its diagrams diff and review like code.

## Install it

Each agent reads skills from its own folder. Run one command in your project.

Claude Code reads `.claude/skills`. This is the default:

```sh
npx draftably skill install
```

Add `--global` to install it in `~/.claude/skills`, for all your projects:

```sh
npx draftably skill install --global
```

Codex and Cursor read `.agents/skills`. For another agent, use the folder that it reads:

```sh
npx draftably skill install --dir .agents/skills
```

You can also install straight from the repository:

```sh
npx skills add byronwall/draftably
```

`npx draftably skill print` prints the skill so you can read it first.

## Update it

The agent reads its installed copy, so that copy does not change when you update draftably. Run
the same command with `--force` to replace it. `draftably check` prints a note when the two
differ.

```sh
npx draftably skill install --force
```

## What the agent does with it

The skill gives the agent one loop, and each step is a CLI command:

1. **Plan the model.** List the boxes, the groups they belong to and the connections, with short
   IDs and human labels.
2. **Write the file**: declarations, then edges, then `layout` lines.
3. **Check it** with `draftably check`. Every warning names the IDs, and a conflict that a
   refinement caused names its line and a fix.
4. **Let the tool choose the layout** with `draftably vary`, which ranks layout variants on a
   contact sheet, then `vary --apply best`.
5. **Look at it** with `inspect --svg` or `--png`, and review `check --metrics`.
6. **Hand it over** with `draftably open`, so you can see it and drag things into place. Your edits
   save to the same file the agent reads.

## Ask for a diagram

Once the skill is installed, ask in plain words:

```text
Draw the checkout flow in src/checkout as a .draft file next to it, and open it for me.
```

The agent writes the file, runs `check` until no error is left, and prints the editor's URL.

The skill's full text is [skills/draftably/SKILL.md](../skills/draftably/SKILL.md). It covers the
syntax, layout engines, cells and refinements.
