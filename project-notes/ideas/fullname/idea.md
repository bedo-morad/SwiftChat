# Collapse firstName + lastName into a single fullName

## What

`User` currently has separate `firstName` and `lastName` fields. Merge them into one
`fullName` field.

## Why

The app treats users as chat participants — it only ever needs a name to *display*, never the
first/last split for sorting, greetings, or formal addressing. Two fields is structure the app
doesn't use: it invites "which do I show?" branching everywhere a name is rendered, and forces
every caller to concatenate. One `fullName` is what the UI actually consumes.

## When

Before real user data exists — i.e. after the tutorial, before launch. Trivial now (schema is
still `ddl-auto: update` from JPA entities, no data to migrate); becomes a data migration once
users have signed up and identity comes from Keycloak.

## The change

```java
// User.java
private String fullName;   // replaces firstName + lastName
```

Follow the field through everywhere it's read/written:

- Wherever a `User` is built from the Keycloak JWT, map `fullName` from the token's `name`
  claim (Keycloak already exposes it) instead of `given_name` / `family_name`.
- Update any DTO / mapper / response that exposed `firstName` / `lastName`.

## Caveat

Once Flyway is enabled (see the schema-management note in `CLAUDE.md`), this stops being a
field rename and needs a migration: add `full_name`, backfill
`concat(first_name, ' ', last_name)`, drop the two old columns.
