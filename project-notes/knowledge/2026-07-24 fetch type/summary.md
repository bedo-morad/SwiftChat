# Summary — FetchType: EAGER vs LAZY

## What FetchType is

Controls **when** JPA loads associated data:

- **LAZY** — load on demand. The relation stays a proxy until accessed, then the query fires.
- **EAGER** — load immediately, together with the parent entity, needed or not.

JPA defaults: `@ManyToOne` / `@OneToOne` → EAGER, `@OneToMany` / `@ManyToMany` → LAZY.

## The decision for SwiftChat

`Chat.messages` (`@OneToMany`) was set to EAGER following a tutorial. The right call is
**LAZY + a paginated repository query**, because:

- A chat's message list is **unbounded** — EAGER is only justified for small, bounded
  relations you always need together (like `Message` → its `Chat`).
- Loading a user's chat list with EAGER fires one message-loading query per chat (N+1)
  and drags full message histories into memory just to render an inbox.

## Why the tutorial used EAGER anyway

Teaching shortcut, not architecture: EAGER lets `chat.getMessages()` work anywhere
without explaining `LazyInitializationException`, pagination, or repository queries.

## When it actually matters (daily active users)

| DAU | Impact |
|---|---|
| 100 | Invisible. |
| 1k | Barely noticeable; fix if you happen to see it. |
| 10k | Real pain — N+1 at peak, connection pool exhaustion, seconds-long responses. |
| 100k | Outage risk — DB saturation; can't scale out of it by adding servers. |

Flip point: somewhere around 1k-10k DAU. But the correct version is nearly free
(two-word change + one query), so the calculus is "why carry the risk."

## The fix (planned, see ideas.md)

```java
@OneToMany(mappedBy = "chat", fetch = FetchType.LAZY)
@OrderBy("createdDate DESC")
private List<Message> messages;
```

```java
// MessageRepository
Page<Message> findByChatIdOrderByCreatedDateDesc(String chatId, Pageable pageable);
```

Caveat: with LAZY, touching `chat.getMessages()` outside a transaction throws
`LazyInitializationException` — fetch through the repository query instead of walking
the entity graph.
