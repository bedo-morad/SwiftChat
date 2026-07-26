# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The Maven project is **nested one level down**: the repo root holds `docker-compose.yml`, while the
actual Spring Boot application (with `pom.xml` and the Maven wrapper) lives in `SwiftChat/`.
Run all Maven commands from `SwiftChat/`, not the repo root.

## Commands

Run from `SwiftChat/` (the directory containing `pom.xml`):

```bash
./mvnw spring-boot:run          # run the app (needs Postgres + Keycloak up)
./mvnw clean package            # build the jar
./mvnw test                     # run all tests
./mvnw test -Dtest=SwiftChatApplicationTests#contextLoads   # run a single test method
```

Infrastructure (from the repo root, where `docker-compose.yml` lives):

```bash
docker compose up -d            # Postgres on :5432, Keycloak on :9090
```

## Runtime dependencies

The app will not start without both containers running:

- **Postgres** — database `SwiftChat`, credentials `username`/`password` on `localhost:5432`.
- **Keycloak** — admin `admin`/`admin` on `localhost:9090`. The app is an OAuth2 resource server
  expecting a realm named `SwiftChat` at `http://localhost:9090/realms/SwiftChat`. This realm must be
  created manually in the Keycloak admin console; it is not provisioned by docker-compose.

The CORS config in `SecurityConfig` only allows `http://localhost:4200`, implying an Angular frontend
consumes this API.

## Architecture

Spring Boot 4.1.0 backend (Java 17) for a chat application. The security layer and the core JPA
domain model are implemented; there are no controllers or WebSocket handlers yet.

- **Authentication** is stateless JWT via Keycloak. `SecurityConfig` disables CSRF, wires the CORS
  filter, and permits Swagger endpoints plus `/ws/**` (WebSocket handshake) while requiring auth on
  everything else.
- **Role mapping** — `KeycloakJwtAuthenticationConverter` merges Spring's default scope authorities
  with Keycloak roles. Note it reads roles from `resource_access.account.roles` specifically (the
  `account` client), prefixes each with `ROLE_`, and replaces hyphens with underscores.
- **Domain model** — three entities under `chat/`, `message/`, `user/`, all extending
  `common/BaseAuditingEntity` (a `@MappedSuperclass` with `createdDate`/`lastModifiedDate` populated
  by `AuditingEntityListener`; `@EnableJpaAuditing` is on `SwiftChatApplication`):
  - `User` — id is an externally assigned String (no `@GeneratedValue`; the named queries call it
    `publicId`). `isUserOnline()` is `@Transient`
    and treats the user as online if `lastSeen` is within the last 5 minutes.
  - `Chat` — a 1:1 conversation between `sender` and `recipient` (both `@ManyToOne` to User).
    `messages` is `FetchType.EAGER` with `@OrderBy("createdDate DESC")`, so `messages.get(0)` is the
    newest message (used by `getLastMessage`/`getLastMessageTime`). `getUnreadMessagesCount` =
    messages addressed to the given senderId with state `SENT`.
  - `Message` — sequence-generated `Long` id (`msg_seq`), `content` is `TEXT`, `state`
    (`SENT`/`SEEN`) and `type` (`TEXT`/`IMAGE`/`AUDIO`/`VIDEO`) are `@Enumerated(STRING)`.
    Sender/receiver are stored as plain String id columns, not relations.
- **Named queries** — JPQL `@NamedQuery` annotations live on the entities; their string names are
  held in sibling `*Constants` classes (e.g. `ChatConstants.FIND_CHAT_BY_SENDER_ID`). Reference the
  constants, not the literals, when using them from repositories.

### Schema management caveat

Both Flyway and JPA are on the classpath, but **Flyway is disabled** (`spring.flyway.enabled: false`)
and Hibernate runs with `ddl-auto: update`, so the schema is currently generated from JPA entities at
startup. If migrations are introduced later, switch `ddl-auto` to `validate` and enable Flyway.

## Conventions

- **Lombok** is used for boilerplate; it is configured as an annotation processor in `pom.xml` and
  excluded from the packaged jar.
- File uploads are capped at 50MB and written to `./upload` (`application.file.uploads.media-output-path`).
