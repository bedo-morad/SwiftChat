# Switch Chat → Messages from EAGER to LAZY + pagination

## What

`Chat.messages` (`@OneToMany`) is currently `FetchType.EAGER`, matching the tutorial being
followed. Change it to `LAZY` and load messages through a paginated repository query instead.

## Why

A chat's message list is **unbounded**. With EAGER, every `Chat` load drags in its entire
message history — even for the inbox screen that only needs sender/recipient/last-active.
Loading a user's chat list fires one message query per chat (N+1) and pulls full histories
into memory for no reason. EAGER is only justified for small, bounded relations you always
need together (like `Message` → its `Chat`).

## When

Before anything real uses this — i.e. after finishing the tutorial, before launch. Harmless at
learning scale; starts to bite around 1k–10k daily active users.

## The change

```java
@OneToMany(mappedBy = "chat", fetch = FetchType.LAZY)
@OrderBy("createdDate DESC")
private List<Message> messages;
```

```java
// MessageRepository
Page<Message> findByChatIdOrderByCreatedDateDesc(String chatId, Pageable pageable);
```

Load the most recent page when a chat is opened; paginate for older messages.

## Caveat

With LAZY, touching `chat.getMessages()` outside a transaction throws
`LazyInitializationException`. That's not a reason to revert to EAGER — fetch messages through
the repository query above instead of walking the entity graph.

## Background

Full reasoning and the scale/impact breakdown: `knowledge/2026-07-24 fetch type`.
