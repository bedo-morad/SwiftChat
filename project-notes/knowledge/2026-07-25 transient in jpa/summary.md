# Summary — @Transient in JPA

## What @Transient does

Tells JPA/Hibernate: **do not persist this field/property to the DB.** It is a
JPA annotation — unrelated to Java's own `transient` keyword (that one is about
Java serialization).

By default every field of an `@Entity` becomes a column. `@Transient` opts one out.

## Two ways it's used

| Placement | Use |
|---|---|
| On a **field** | An in-memory value you never store (e.g. a computed `fullName`). |
| On a **getter** | A *derived* JavaBean property. Without it, Hibernate treats the property as persistent and tries to create a column. |

## The case in `User.java`

`isUserOnline()` is a computed property — calculated from `lastSeen` every call,
never stored. `@Transient` on the getter stops Hibernate from creating a
`user_online` column for it.

## Two bugs spotted in that method

```java
@Transient
public boolean isUserOnline() {
    return lastSeen != null && lastSeen.isAfter(LocalDateTime.now().plusMinutes(LAST_ACTIVE_INTERVAL))
}
```

1. **Missing semicolon** after `return` — won't compile.
2. **Inverted logic** — `plusMinutes(5)` asks "is lastSeen in the *future*?", which
   never holds, so it always returns `false`. "Online" = seen recently → use
   `minusMinutes`.

Fix:

```java
@Transient
public boolean isUserOnline() {
    return lastSeen != null && lastSeen.isAfter(LocalDateTime.now().minusMinutes(LAST_ACTIVE_INTERVAL));
}
```
