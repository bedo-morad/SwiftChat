# Chat — NamedQuery

**User:** hey can you explain wto me what is NamedQuery and how it works because this is my first time seeing it and i have used it @SwiftChat/src/main/java/com/SwiftChat/SwiftChat/user/User.java and @SwiftChat/src/main/java/com/SwiftChat/SwiftChat/message/Message.java

**Assistant:**

`@NamedQuery` is a JPA annotation used to define a reusable database query on an entity.

Instead of writing the query every time you need it, you give it a name:

```java
@NamedQuery(
    name = "Users.findUserByEmail",
    query = "SELECT u FROM User u WHERE u.email = :email"
)
```

Then you execute it later using the name.

These are JPQL queries, not raw SQL. JPQL works with entity class names (`User`, `Message`) and Java field names (`email`, `chat.id`, `createdDate`), not database table/column names directly.

The queries in `User.java` find a user by email, find all users except one ID, and find a user by ID. The queries in `Message.java` find messages by chat ID ordered by creation date and bulk-update message state for a chat.

JPA scans the entity classes at startup, registers the named queries, and later code retrieves them by name through `EntityManager`:

```java
User user = entityManager
        .createNamedQuery("Users.findUserByEmail", User.class)
        .setParameter("email", "john@example.com")
        .getSingleResult();
```

For the message update:

```java
int updatedCount = entityManager
        .createNamedQuery("Messages.setMessagesToSeenByChat")
        .setParameter("newState", MessageState.SEEN)
        .setParameter("chatId", chatId)
        .executeUpdate();
```

Update queries need a transaction.

---

**User:** ok why don't i just write the query in the Repo when i create the UserRepository later ?

**Assistant:**

Yes—you usually **can, and probably should**, put the query in `UserRepository` when using Spring Data JPA.

Use derived query methods when possible:

```java
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    List<User> findAllByIdNot(String publicId);
}
```

Spring interprets `findByEmail` as a query automatically. For more complex queries, use repository `@Query`:

```java
@Query("SELECT u FROM User u WHERE u.id <> :publicId")
List<User> findAllExcept(@Param("publicId") String publicId);
```

For messages:

```java
List<Message> findByChatIdOrderByCreatedDate(String chatId);
```

A bulk update uses `@Modifying`, `@Query`, and a transaction:

```java
@Modifying
@Query("UPDATE Message m SET m.state = :newState WHERE m.chat.id = :chatId")
int updateStateByChatId(
        @Param("chatId") String chatId,
        @Param("newState") MessageState newState
);
```

Recommended order:

1. Derived repository method.
2. Repository `@Query` for complex queries.
3. `@NamedQuery` when there is a specific reason to define a query globally or share it.

`findById(publicId)` is already supplied by `JpaRepository`, so `FIND_USER_BY_PUBLIC_ID` is normally unnecessary unless public ID later becomes a separate field.
