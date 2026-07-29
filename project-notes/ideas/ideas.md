# Ideas

Things that might be added **after** the project is finished. Not current tasks.
One line per idea below — full writeup lives in each idea's folder.

## The list

- **EAGER → LAZY + pagination** — `Chat.messages` is `EAGER`; unbounded message history loaded on every chat fetch (N+1). Switch to `LAZY` + paginated query. see `ideas/eager to lazy`
- **firstName + lastName → fullName** — collapse the two `User` name fields into one `fullName`; the app only ever displays a name. see `ideas/fullname`
- **A real file storage service** — local-disk paths + media bytes inlined in every message response; move to a `FileStorage` interface (local/S3) with keys and a streaming download endpoint. see `ideas/file storage`
