# Summary — AnonymousAuthenticationToken

## Takeaway

When nobody logs in, Spring Security does **not** leave `SecurityContextHolder.getContext().getAuthentication()` as `null`. It inserts an `AnonymousAuthenticationToken` as a placeholder, so there is always *something* there. To check "is a real, authenticated user present," you must explicitly exclude the anonymous case:

```java
if (!(SecurityContextHolder.getContext().getAuthentication() instanceof AnonymousAuthenticationToken)) {
    // a real logged-in user exists, not the anonymous placeholder
}
```

## Why the `instanceof` check specifically

- `AnonymousAuthenticationToken.isAuthenticated()` returns **`true`**, so the standard `.isAuthenticated()` test alone is misleading — the anonymous token passes it.
- Checking `authentication != null` is not enough either, because the anonymous token is non-null.
- `instanceof AnonymousAuthenticationToken` is the common idiom to exclude exactly that annoying anonymous case.

## Where this matters in the project

`UserSynchronizerFilter` (`interceptor/UserSynchronizerFilter.java`) uses this check to run user-sync logic only for genuine logged-in requests.

⚠️ Note: as of writing, the filter's `if` body is empty **and** it never calls `filterChain.doFilter(...)`, so every request currently hangs. Both are pending work.
