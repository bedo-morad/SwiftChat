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

Spring Boot 4.1.0 backend (Java 17) for a chat application. The security layer, the core JPA domain
model, the chat and message REST slices, and file storage are implemented. Still missing: WebSocket
handlers and the notification system (`//todo notification` markers throughout `MessageService`).

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
    `senderId`/`recipientId` are plain String id columns, not relations. `mediaFilePath` holds the
    on-disk path for media messages (the bytes are never stored in the DB).
- **Named queries** — JPQL `@NamedQuery` annotations live on the entities; their string names are
  held in sibling `*Constants` classes (e.g. `ChatConstants.FIND_CHAT_BY_SENDER_ID`). Reference the
  constants, not the literals, when using them from repositories. Because the constants are *names*,
  repository methods must use `@Query(name = Xxx.CONSTANT)` — plain `@Query(Xxx.CONSTANT)` would be
  parsed as JPQL. All repositories now do this correctly.
- **REST layer** — one package per slice; `chat/` is the reference shape:
  `ChatController` (`/api/v1/chats`) → `ChatService` → `ChatMapper` (a `@Service`, not MapStruct) →
  `ChatResponse` DTO. Constructor injection via Lombok `@RequiredArgsConstructor`. Endpoints that
  return a bare string wrap it in `common/StringResponse`.
  - The current user comes from the injected `Authentication` — `currentUser.getName()` is the JWT
    `sub`, i.e. the `User` id. Only `createChat` takes ids as request params.
  - Despite their names, `findChatsBySenderId` matches chats where the user is sender *or* recipient,
    and `findChatBySenderIdAndRecipientId` matches the pair in either direction, so `createChat` is
    idempotent per pair.
  - Missing users raise `jakarta.persistence.EntityNotFoundException`; there is no
    `@ControllerAdvice` yet, so it surfaces as a 500. `MessageService` throws the same for a missing
    chat.
  - `message/` follows the same shape: `MessageController` (`/api/v1/messages`) → `MessageService` →
    `MessageMapper` → `MessageResponse`. Endpoints: `POST` (save, takes a `MessageRequest` body),
    `POST /upload-media` (`multipart/form-data`, `chatId` + `file` params), `PATCH` (mark a chat's
    messages `SEEN` via `chatId` param), `GET /chat/{chatId}` (list messages).
  - Note the asymmetry in how the sender is resolved: `saveMessage` trusts the `senderId`/
    `recipientId` in the request body, while `uploadMessageMedia` and `setMessagesToSeen` derive them
    from the `Chat` plus `authentication.getName()` (private `getSenderId`/`getRecipientId` helpers
    that pick whichever side of the chat matches the caller). The body-supplied ids are unvalidated.
  - `setMessagesToSeen` is `@Transactional` because the underlying named query is a bulk
    `@Modifying` update; it currently marks *all* messages in the chat as seen, not just those
    addressed to the caller (the `recipientId` filter is commented out pending notifications).
  - `uploadMessageMedia` hardcodes `MessageType.IMAGE` regardless of the uploaded file's type.
  - `MessageMapper` populates `MessageResponse.media` by reading the file back off disk via
    `FileUtils.readFileFromLocation(mediaFilePath)` — so every `GET /chat/{chatId}` loads the full
    bytes of every media message in the chat into the response.
- **File storage** — `file/` has two classes:
  - `FileService.saveFile(file, senderId)` writes to
    `<media-output-path>/users/<senderId>/<currentTimeMillis>.<ext>`, creating directories as needed,
    and returns the absolute-ish path stored in `Message.mediaFilePath`. The extension comes from the
    original filename (lowercased, empty if absent). It never throws: a failed `mkdirs` or an
    `IOException` is logged and `null` is returned, so callers must tolerate a null path.
  - `FileUtils` is a static-only helper (private constructor); `readFileFromLocation` returns an empty
    `byte[]` for a blank path or a read failure, again logging rather than throwing.
- **User synchronization** — `UserSynchronizerFilter` (`OncePerRequestFilter`) runs on every
  authenticated request and upserts the `User` via `UserSynchronizer`. The JWT `sub` claim is the
  user id (not email — see comments in `UserSynchronizer`). `UserMapper` maps
  `sub`/`given_name`/`nickname`/`family_name`/`email` claims to the entity.

### Schema management caveat

Both Flyway and JPA are on the classpath, but **Flyway is disabled** (`spring.flyway.enabled: false`)
and Hibernate runs with `ddl-auto: update`, so the schema is currently generated from JPA entities at
startup. If migrations are introduced later, switch `ddl-auto` to `validate` and enable Flyway.

## Conventions

- **Lombok** is used for boilerplate; it is configured as an annotation processor in `pom.xml` and
  excluded from the packaged jar.
- File uploads are capped at 50MB and written to `./upload` (`application.file.uploads.media-output-path`),
  under a per-sender subfolder. `file/FileService` is the single seam for writes, `file/FileUtils` for reads.
- **Failure style in `file/`** — both classes log and return a falsy value (`null` / empty array)
  instead of throwing, so I/O problems surface as a missing media path or empty `media` bytes rather
  than an error response.

## Project notes

`project-notes/` holds two agent-maintained knowledge stores. Each has a `README.md` with the
exact naming rules, file conventions, and style rules — read the relevant one before writing:

- **`project-notes/ideas/`** — post-v1 ideas (things to maybe add after launch, not current tasks).
  When the user asks to add an idea (e.g. "add to ideas: ..."), follow `project-notes/ideas/README.md`.
- **`project-notes/knowledge/`** — saved design conversations (the *why* behind decisions).
  When the user asks to save a conversation (e.g. "save this, the topic is '...'"), follow
  `project-notes/knowledge/README.md`.
