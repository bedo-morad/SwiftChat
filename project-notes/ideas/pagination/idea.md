# Paginate the list endpoints

## What

All three `GET` collection endpoints return an unbounded `List<T>`. Give them `Pageable` parameters
and a consistent page-shaped response DTO.

| Endpoint | Returns | Grows with |
|---|---|---|
| `GET /api/v1/users` (`getAllUsersExceptSelf`) | `List<UserResponse>` | every user ever registered |
| `GET /api/v1/chats` (`getChatsByRecipientId`) | `List<ChatResponse>` | the caller's chat count |
| `GET /api/v1/messages/chat/{chatId}` (`getMessagesByChatId`) | `List<MessageResponse>` | the chat's full history |

## Why

Every one of these is a "select the whole table and serialize it" query with no ceiling. The user
list is the sharpest: it scales with total signups, not with anything the caller did, so the response
size for one person's contact picker is a function of how successful the app is. Message history is
the next worst — and because `MessageResponse` currently inlines media bytes, an unpaginated chat
fetch is also an unpaginated *file* fetch (see `ideas/file storage`).

There's also a client-side reason beyond payload size: a chat UI wants "most recent 50, scroll for
older," which is a page query. Returning everything means the frontend does the windowing in
JavaScript over data it should never have received.

## When

Before launch for `/users` and messages. The chat list can wait — a realistic user has tens of
chats, not thousands — but it's the same change and cheap to do at the same time.

## The change

`Page<T>` through the repository, controller, and service:

```java
// UserRepository
@Query(name = UserConstants.FIND_ALL_USERS_EXCEPT_SELF)
Page<User> findAllUsersExceptSelf(@Param("publicId") String publicId, Pageable pageable);
```

```java
@GetMapping
public ResponseEntity<PageResponse<UserResponse>> getAllUsersExceptSelf(
        Authentication authentication,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) { ... }
```

Spring Data accepts `Pageable` on a `@Query(name = ...)` named query without changing the JPQL, so
the existing `@NamedQuery` strings stay as they are — only the return type and an extra parameter
change.

Add one `common/PageResponse<T>` record (content, page, size, totalElements, totalPages, last)
rather than serializing Spring's `Page` directly — `Page`'s JSON shape is unstable across Spring
versions and Boot logs a warning about exactly this.

Messages want the newest page first (`Sort.by("createdDate").descending()`), matching the existing
`@OrderBy` on `Chat.messages`.

## Relationship to `ideas/eager to lazy`

That idea changes the *entity* side: `Chat.messages` from `EAGER` to `LAZY` so loading a chat stops
dragging in its history, and it sketches a paginated `findByChatIdOrderByCreatedDateDesc`. This idea
is the *API* side — the request parameters, the response envelope, and the two endpoints
(`/users`, `/chats`) that fetch type has nothing to do with.

They're worth doing together for messages, since the paginated repository query is the piece they
share. Neither one alone fixes the message endpoint: `LAZY` without a page parameter still returns
every message, and paging without `LAZY` still loads them all to build the page.
