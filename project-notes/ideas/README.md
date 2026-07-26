# Ideas

Post-v1 ideas — things that *might* be added after the project is finished. Not current tasks, not commitments.

`ideas.md` is a clean index: one line per idea, linking to that idea's folder. Every idea gets
its own subfolder holding `idea.md` (the longer writeup) plus any resources (snippets, images,
plans) gathered while thinking it through.

## How to add an idea

When the user asks to add an idea (e.g. "add to ideas: ..."):

1. Create a subfolder here named with a short, useful human phrase — easy to understand and
   remember at a glance. No date prefix (ideas are a living backlog, not chronological).
   If the user's suggested name is vague or awkward, propose a better one.
2. Inside it, write `idea.md` — the longer writeup (see rules below).
3. Add one line to `ideas.md` under the list:

   ```
   - **Short title** — one-line what/why. see `ideas/<folder>`
   ```

## Rules for `idea.md`

- Lead with what the idea is and why it matters — no throat-clearing.
- State the trigger: when this becomes worth doing (e.g. "when user count grows", "before v1 ships").
- Include a concrete sketch of the change (code, steps, or a short plan) when one is known.
- One idea per folder. Don't merge two ideas into one writeup.
- Keep resources beside it in the same folder; reference them from `idea.md`.

## Rules for the `ideas.md` index

- One line per idea, using the format above. Detail lives in `idea.md`, not here.
- If an idea gets built, mark its index line with strikethrough (`~~idea~~`) — done things stay
  visible as history but are clearly resolved. The folder can stay for reference.
- One idea per line; don't merge two ideas into one entry.
