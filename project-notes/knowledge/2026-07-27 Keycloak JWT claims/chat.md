**user**

no take another look at "SwiftChat/src/main/java/com/SwiftChat/SwiftChat/user/UserMapper.java"and explain it to me don't do line by line explanation i want to understand how this works with keycloak because i used other Mappers and they didn't look like this

**assistant**

`UserMapper` is not a typical mapper (like MapStruct or ModelMapper that converts between two known object types). It takes a raw `Map<String, Object>` — the JWT claims — and manually picks out the fields it cares about.

## Why it looks different

Most mappers you've seen probably convert between two of *your own* types (e.g. `UserDto → User`). This one converts from **Keycloak's JWT claim structure** into your `User` entity. Since JWT claims are just a key-value map with no compile-time type, there's no interface to generate code from — you have to do it by hand.

## What Keycloak actually puts in those claims

When a user authenticates, Keycloak issues a JWT whose payload looks roughly like:

```json
{
  "sub": "a1b2c3d4-...",        → user.id
  "given_name": "John",         → user.firstName  (or "nickname" as fallback)
  "family_name": "Doe",         → user.lastName
  "email": "john@example.com"   → user.email
}
```

`sub` is the stable, unique user identifier in Keycloak — it never changes even if the user updates their email or name. That's why it's used as the primary key (`user.setId(...)`), and why the old email-based lookup was dropped (as you saw in `UserSynchronizer`).

## The `given_name` / `nickname` fallback

```java
if (attributes.containsKey("given_name")) { ... }
else if (attributes.containsKey("nickname")) { ... }
```

Keycloak sends `given_name` for users with a full profile. `nickname` is a fallback for social logins (e.g. GitHub OAuth) where the provider doesn't supply a structured first/last name — GitHub sends `nickname` instead. This makes the mapper tolerant of both flows.

## `lastSeen = now()`

```java
user.setLastSeen(LocalDateTime.now());
```

Every time this mapper runs (i.e. every authenticated request, via the filter), `lastSeen` gets stamped with the current time. That's what keeps `isUserOnline()` accurate — it's not a separate "heartbeat" endpoint, it piggybacks on normal API traffic.

## The short version

It's a manual claim extractor, not a structural mapper. It exists because the source is an untyped JWT map from an external IdP, not one of your own types.

---
**user**

ok ok can you give me a full example of how Keycloak JWT looks like ?

**assistant**

Here's what a real Keycloak JWT payload looks like (decoded):

```json
{
  "exp": 1753574400,
  "iat": 1753570800,
  "jti": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "iss": "http://localhost:9090/realms/SwiftChat",
  "aud": ["account"],
  "sub": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "typ": "Bearer",
  "azp": "swiftchat-client",
  "session_state": "abc123",
  "acr": "1",
  "realm_access": {
    "roles": ["offline_access", "uma_authorization", "default-roles-swiftchat"]
  },
  "resource_access": {
    "account": {
      "roles": ["manage-account", "view-profile"]
    }
  },
  "scope": "openid email profile",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "email": "john@example.com"
}
```

## What UserMapper actually picks out of this

| JWT claim | maps to | why |
|---|---|---|
| `sub` | `user.id` | stable unique ID, never changes even if user updates email |
| `given_name` | `user.firstName` | standard OIDC profile claim |
| `family_name` | `user.lastName` | standard OIDC profile claim |
| `email` | `user.email` | standard OIDC email claim |

Everything else (`iss`, `exp`, `realm_access`, `resource_access`, etc.) is ignored by `UserMapper` — Spring Security already consumed the security-relevant parts upstream when it validated the token.

## The `nickname` fallback explained

For a GitHub social login through Keycloak, the JWT looks different — GitHub doesn't provide `given_name`/`family_name`:

```json
{
  "sub": "f47ac10b-...",
  "nickname": "johndoe",
  "email": "john@example.com"
}
```

That's why `UserMapper` has the `else if (attributes.containsKey("nickname"))` branch — it handles social logins where the provider only gives a username, not a structured name.

---
**user**

ok i understand some of them like sub , email , name , given_name and family_name but what about the other ones when to use them and how

**assistant**

Good question. Let me group the rest by what they're *for*, and note who actually reads them (mostly Spring Security, not your code).

## 1. Timing / validity claims (Spring validates these automatically)

| Claim | Meaning | When you use it |
|---|---|---|
| `exp` | **Expiration** — Unix timestamp when the token dies | Spring rejects the request automatically if expired. You rarely touch it. |
| `iat` | **Issued at** — when the token was created | Occasionally used to detect "token too old" policies. Usually just Spring. |
| `jti` | **JWT ID** — unique ID for this specific token | Used for token blacklisting/revocation (e.g. "log this token out"). You'd read it only if you build a denylist. |

You almost never read these manually — the resource-server filter checks `exp`/`iat` before your code even runs. If they're bad, the request gets a 401 and never reaches you.

## 2. Identity-of-the-token claims (who issued it, who it's for)

| Claim | Meaning | When you use it |
|---|---|---|
| `iss` | **Issuer** — the realm URL that signed it (`.../realms/SwiftChat`) | Spring validates this matches your configured `issuer-uri`. Guards against tokens from a different realm/server. |
| `aud` | **Audience** — which service(s) the token is meant for | You validate that *your* API is in the audience, so a token minted for another service can't be replayed against yours. |
| `azp` | **Authorized party** — the client (frontend app) that requested the token | Read it if you need to know *which app* the user logged in through (e.g. web vs mobile). Rarely needed. |
| `typ` | **Type** — `"Bearer"` | Informational. You basically never read it. |

`iss` and `aud` are the security-critical pair, and Spring checks them for you when configured properly.

## 3. Authorization / roles claims (this is the important one for you)

```json
"realm_access":    { "roles": ["default-roles-swiftchat", ...] },
"resource_access": { "account": { "roles": ["manage-account", ...] } }
```

- **`realm_access.roles`** — roles that apply across the *entire realm* (global roles like `admin`, `user`).
- **`resource_access.<client>.roles`** — roles scoped to a *specific client/service*.

**This is what your `KeycloakJwtAuthenticationConverter` reads** to build Spring's authorities. Per your CLAUDE.md, it specifically pulls from `resource_access.account.roles`, prefixes each with `ROLE_`, and swaps hyphens for underscores. So `manage-account` becomes authority `ROLE_MANAGE_ACCOUNT`, which is what `@PreAuthorize("hasRole('MANAGE_ACCOUNT')")` or `.hasRole(...)` in your security config would check against.

> Side note: most apps read `realm_access.roles` for their own app roles. Reading `account`'s roles is a bit unusual — those are Keycloak's built-in account-management roles. Worth double-checking that's the client you actually want roles from.

## 4. Session / auth-context claims

| Claim | Meaning | When you use it |
|---|---|---|
| `session_state` / `sid` | Keycloak SSO session ID | Used for back-channel logout — Keycloak tells your app "this session ended." Needed only if you implement single-logout. |
| `acr` | **Authentication Context Class Reference** — *how strongly* the user authenticated (`"1"` = password, higher = MFA) | Read it for step-up auth: e.g. require MFA (`acr` ≥ 2) before a sensitive action. |
| `scope` | OAuth scopes granted (`openid email profile`) | Spring turns these into `SCOPE_*` authorities. Governs *what data/endpoints* the token can access, vs roles which govern *what the user can do*. |
| `email_verified` | Whether Keycloak confirmed the email | Gate features behind verified email (e.g. block unverified users from certain actions). |

## The mental model

There are three buckets:

1. **Token plumbing** (`exp`, `iat`, `iss`, `aud`, `jti`, `typ`) → **Spring handles it.** You configure `issuer-uri` and forget it.
2. **Authorization** (`realm_access`, `resource_access`, `scope`) → **your converter reads it** to decide what the user can do.
3. **Profile** (`sub`, `email`, `name`, `given_name`, `family_name`) → **your `UserMapper` reads it** to build the local user row.

Your code only ever touches buckets 2 and 3. Bucket 1 is validated for you before your code runs.

How to *access* any of them in code, if you ever need to:

```java
jwt.getClaimAsString("azp");                          // simple string claim
jwt.getClaimAsStringList("aud");                      // list claim
Map<String,Object> ra = jwt.getClaim("realm_access"); // nested object
```
