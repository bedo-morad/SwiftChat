package com.SwiftChat.SwiftChat.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSynchronizer {

    private final UserRepo userRepo;
    private final UserMapper userMapper;


    public void synchronizeWithIdp(Jwt token) {
        log.info("Synchronizing User with Idp");
        getUserEmail(token).ifPresent(userEmail->{
            log.info("Synchronizing user having email {}", userEmail);
            // commented out because we are now using the sub claim as the unique identifier for users instead of email
//            Optional<User> optUser = userRepo.findByEmail(userEmail);
            User user = userMapper.fromTokenAttributes(token.getClaims());
            // commented for same reason so we don't duplicate
//            optUser.ifPresent(value -> user.setId(optUser.get().getId()));
            userRepo.save(user);
        });
    }

    private Optional<String> getUserEmail(Jwt token) {
        Map<String, Object> attributes = token.getClaims();
        if (attributes.containsKey("email")) {
            return Optional.of(attributes.get("email").toString());
        }
        return Optional.empty();
    }
}
