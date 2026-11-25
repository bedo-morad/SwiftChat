package com.SwiftChat.SwiftChat.ws;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
@Slf4j
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String PRINCIPAL_ATTRIBUTE = StompAuthChannelInterceptor.class.getName() + ".principal";

    private final JwtDecoder jwtDecoder;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand()) || StompCommand.STOMP.equals(accessor.getCommand())) {
            Principal principal = authenticate(accessor);
            accessor.setUser(principal);
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put(PRINCIPAL_ATTRIBUTE, principal);
            }
        } else if (accessor.getUser() == null && accessor.getSessionAttributes() != null) {
            Object principal = accessor.getSessionAttributes().get(PRINCIPAL_ATTRIBUTE);
            if (principal instanceof Principal authenticated) {
                accessor.setUser(authenticated);
            }
        }
        return message;
    }

    private Principal authenticate(StompHeaderAccessor accessor) {
        String header = getAuthorizationHeader(accessor);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            log.warn("Rejecting STOMP CONNECT without a bearer token");
            throw new AccessDeniedException("Missing bearer token on STOMP CONNECT");
        }
        try {
            Jwt jwt = jwtDecoder.decode(header.substring(BEARER_PREFIX.length()));
            return new JwtAuthenticationToken(jwt);
        } catch (JwtException exception) {
            log.warn("Rejecting STOMP CONNECT with an invalid bearer token", exception);
            throw new AccessDeniedException("Invalid bearer token on STOMP CONNECT", exception);
        }
    }

    private String getAuthorizationHeader(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader(AUTHORIZATION);
        return header != null ? header : accessor.getFirstNativeHeader(AUTHORIZATION.toLowerCase());
    }
}
