# Summary — Keycloak JWT claims & UserMapper

## Why UserMapper looks unusual

It is **not** a structural mapper (MapStruct / ModelMapper converting between two known types).
It converts an untyped `Map<String, Object>` — the raw JWT claims from Keycloak — into the `User`
entity. No compile-time source type exists, so the extraction is manual, claim by claim.

## What UserMapper reads

| JWT claim | maps to | note |
|---|---|---|
| `sub` | `user.id` | stable unique ID, never changes even if email/name change → used as PK |
| `given_name` | `user.firstName` | standard OIDC profile claim |
| `nickname` | `user.firstName` (fallback) | social logins (e.g. GitHub) send this instead of a structured name |
| `family_name` | `user.lastName` | |
| `email` | `user.email` | |
| — | `user.lastSeen = now()` | stamped every call → powers `isUserOnline()` without a heartbeat endpoint |

## The three buckets of claims

1. **Token plumbing** — `exp`, `iat`, `jti`, `iss`, `aud`, `typ` → **Spring validates automatically**
   (once `issuer-uri` is configured). Bad token = 401 before your code runs. You rarely read these.
2. **Authorization** — `realm_access.roles`, `resource_access.<client>.roles`, `scope` →
   **read by `KeycloakJwtAuthenticationConverter`** to build Spring authorities.
3. **Profile** — `sub`, `email`, `name`, `given_name`, `family_name` → **read by `UserMapper`**.

Your code only touches buckets 2 and 3.

## Claim reference

| Claim | Meaning | When you'd use it |
|---|---|---|
| `exp` / `iat` | expiry / issued-at | Spring checks expiry; `iat` for "too old" policies |
| `jti` | unique token ID | token denylist / revocation |
| `iss` | issuer realm URL | Spring validates vs `issuer-uri` (blocks foreign-realm tokens) |
| `aud` | intended audience | reject tokens minted for another service |
| `azp` | authorized party (client app) | know which app the user logged in through (web vs mobile) |
| `realm_access.roles` | realm-wide roles | typical place apps read their app roles |
| `resource_access.<client>.roles` | per-client roles | what SwiftChat's converter reads (from `account`) |
| `scope` | OAuth scopes | Spring → `SCOPE_*` authorities; governs *data access* vs roles' *actions* |
| `session_state` / `sid` | SSO session ID | back-channel / single logout |
| `acr` | auth strength (`1`=password, higher=MFA) | step-up auth before sensitive actions |
| `email_verified` | email confirmed | gate features behind verified email |

## Gotcha noted

SwiftChat's converter reads roles from `resource_access.account.roles` — the `account` client is
Keycloak's built-in account-management client. Most apps read `realm_access.roles` or their own
client. Worth confirming that's the intended source.

## Reading claims in code

```java
jwt.getClaimAsString("azp");                          // simple string
jwt.getClaimAsStringList("aud");                      // list
Map<String,Object> ra = jwt.getClaim("realm_access"); // nested object
```
