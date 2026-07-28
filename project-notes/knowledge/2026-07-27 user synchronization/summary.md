# Summary — User synchronization (IdP → local DB)

## What it does

On every authenticated request, the logged-in Keycloak user is copied into the local `users`
table so chats/messages have a local record to attach to. Two classes:

- **`UserSynchronizerFilter`** — a `OncePerRequestFilter`; the trigger.
- **`UserSynchronizer`** — the service; maps the JWT and saves.

Flow: `request → JWT validated → filter → synchronizer → UserMapper → userRepo.save()`

## The upsert trick

`User.id` is set from the JWT `sub` claim (stable, externally assigned, no `@GeneratedValue`).
Same user → same `sub` → same primary key, so `userRepo.save()` **inserts on first request,
updates on every later one**. Each update refreshes `lastSeen`, which powers `isUserOnline()`
(online = seen in last 5 min). No heartbeat endpoint needed — it piggybacks on normal traffic.

## Why the commented-out email lookup was dropped

The old approach keyed users by email and generated the id locally, so it had to
`findByEmail` + reuse the existing id to avoid duplicate rows. Now that the id **is** `sub`,
that lookup is redundant — `save` overwrites the same PK automatically.

## Known issues flagged

| Issue | Detail |
|---|---|
| **BUG: filter never calls `filterChain.doFilter(...)`** | The chain dead-ends — request never reaches the controller, client gets a blank response. The injected `filterChain` is accepted and ignored. |
| Email gate is legacy | `synchronizeWithIdp` still no-ops if the `email` claim is missing, even though `sub` is now the identifier. A token with `sub` but no email won't sync. Could gate on `sub` instead. |
| Filter ordering | Must run **after** the JWT/resource-server filter so `getAuthentication()` returns the validated token (not anonymous). As a plain `@Component`, confirm it's wired into the Spring Security chain in `SecurityConfig`, not just the raw servlet chain. |

## The anonymous check

```java
if (!(getAuthentication() instanceof AnonymousAuthenticationToken)) { ... }
```

Spring uses `AnonymousAuthenticationToken` for unauthenticated requests. The `!(...)` means
"only sync if a real user is logged in"; then cast to `JwtAuthenticationToken` and pass
`token.getToken()` (the raw `Jwt`) to the synchronizer.
