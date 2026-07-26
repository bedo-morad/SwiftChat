# Chat — @Transient in JPA

> Trimmed conversation. Everything kept below is verbatim — not summarized.

---

**User:** can you explain Transient for me and i have used it in @SwiftChat/src/main/java/com/SwiftChat/SwiftChat/user/User.java

**Assistant:**

## `@Transient` in JPA

`@Transient` tells JPA/Hibernate: **do not persist this field/property to the database.** It has nothing to do with Java's own `transient` keyword (that one is about Java serialization). They overlap in spirit but are different mechanisms.

In your `User` entity, every field like `firstName`, `email`, `lastSeen` becomes a column in the `users` table. Hibernate maps them automatically. `@Transient` opts something out of that mapping.

Two ways it's used:

**On a field** — a value you keep in memory but never store:
```java
@Transient
private String fullName; // computed, not a column
```

**On a getter (your case)** — a *derived/computed* property. `isUserOnline()` isn't stored data; it's calculated from `lastSeen` every time you call it. Without `@Transient`, Hibernate would treat the JavaBean property `userOnline` as persistent and try to create an `is_user_online` (or `user_online`) column, which makes no sense. `@Transient` stops that.

So: `isUserOnline()` is computed on the fly from a real column (`lastSeen`), and is never itself written to or read from the DB.

## Two bugs in that method though

```java
@Transient
public boolean isUserOnline() {
    return lastSeen != null && lastSeen.isAfter(LocalDateTime.now().plusMinutes(LAST_ACTIVE_INTERVAL))
}
```

1. **Missing semicolon** after the `return` — this won't compile.
2. **Inverted logic** — `plusMinutes(5)` asks "is lastSeen more than 5 minutes in the *future*?" which never happens for a real last-seen timestamp, so it always returns `false`. "Online" means *seen recently*, i.e. within the last 5 minutes, so you want `minusMinutes`:

```java
@Transient
public boolean isUserOnline() {
    return lastSeen != null && lastSeen.isAfter(LocalDateTime.now().minusMinutes(LAST_ACTIVE_INTERVAL));
}
```

---
