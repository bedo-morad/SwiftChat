# Knowledge

Saved conversations that shaped this project — the *why* behind decisions, not the code itself.

## How to add a conversation

When the user asks to save a conversation (e.g. "save this, the topic is '...'"):

1. Create a folder here named `YYYY-MM-DD short phrase` (e.g. `2026-07-24 fetch type`).
   The phrase must be both short and useful — easy to understand and remember at a glance.
   If the user's suggested name is vague or awkward, propose a better one.
2. Write two files inside it:
   - `summary.md` — the takeaways. First file to read when revisiting the topic.
   - `chat.md` — the actual conversation messages with off-topic exchanges removed.
     Trimming means deleting unrelated messages, not summarizing — kept messages stay verbatim.

## Rules for `summary.md`

- Fits on roughly one screen. If it can't, the topic is too broad — split it.
- Lead with the decision or takeaway, not the backstory. No throat-clearing.
- Prefer tables and lists over prose wherever the content is structured.

## Rules for `chat.md`

- Kept messages are copied **verbatim** — typos and all. Never reword or summarize inside `chat.md`;
  summarizing is what `summary.md` is for.
- Only ever remove **whole messages**. A message is either on-topic and kept in full, or off-topic
  and cut entirely — never trim parts of a message.
- Separators (`---`) go only **between turns**, where one turn is a user message together with its
  assistant reply. Never put a separator between the user and the assistant of the same turn.

  Correct:
  ```
  ---
  user
  assistant
  ---
  user
  assistant
  ---
  ```

  Wrong:
  ```
  ---
  user
  ---
  assistant
  ```

## General rules

- Folder names sort by date naturally — keep the `YYYY-MM-DD` prefix.
- Same two file names in every folder. The folder carries the topic, the files don't repeat it.
- See `2026-07-24 fetch type` for a reference example.
