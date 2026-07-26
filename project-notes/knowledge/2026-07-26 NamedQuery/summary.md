# Summary — NamedQuery

## Takeaway

`@NamedQuery` defines a reusable JPQL query on a JPA entity. It is registered when the application starts and executed later by name through `EntityManager` or, in some cases, Spring Data JPA.

## Queries in this project

| Entity | Query | Purpose |
|---|---|---|
| `User` | `Users.findUserByEmail` | Finds a user by `email` |
| `User` | `Users.findAllUsersExceptSelf` | Finds users whose `id` differs from `publicId` |
| `User` | `Users.findUserByPublicId` | Finds a user by `id` |
| `Message` | `Messages.findMessageByChatId` | Finds chat messages ordered by `createdDate` |
| `Message` | `Messages.setMessagesToSeenByChat` | Bulk-updates message state for a chat |

JPQL uses entity and Java field names (`User`, `Message`, `m.chat.id`), not table and column names directly. Parameters such as `:email` must be supplied with a matching `.setParameter("email", value)`.

## Repository recommendation

For Spring Data JPA repositories, prefer:

1. Derived methods when the method name expresses the query:
   ```java
   Optional<User> findByEmail(String email);
   List<User> findAllByIdNot(String publicId);
   List<Message> findByChatIdOrderByCreatedDate(String chatId);
   ```
2. Repository `@Query` for more complex JPQL.
3. `@NamedQuery` only when a query needs to be shared or deliberately defined globally.

`findById(publicId)` already comes from `JpaRepository`, so a separate named query for the entity ID is normally unnecessary. Keep named parameter spelling consistent (`publicId` vs `publicID`). Bulk update queries need `@Modifying` and a transaction.
