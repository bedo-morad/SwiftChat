package com.SwiftChat.SwiftChat.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User,String> {

    @Query(UserConstants.FIND_USER_BY_EMAIL)
    Optional<User> findUserByEmail(@Param("email") String userEmail);

    @Query(name = UserConstants.FIND_USER_BY_PUBLIC_ID)
    Optional<User> findUserByPublicId(@Param("senderId") String senderId);
}
