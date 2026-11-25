package com.SwiftChat.SwiftChat.typing;

import com.SwiftChat.SwiftChat.chat.ChatParticipants;
import com.SwiftChat.SwiftChat.chat.ChatRepository;
import com.SwiftChat.SwiftChat.notification.Notification;
import com.SwiftChat.SwiftChat.notification.NotificationService;
import com.SwiftChat.SwiftChat.notification.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
@Slf4j
public class TypingController {

    private final ChatRepository chatRepository;
    private final NotificationService notificationService;

    @MessageMapping("/typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        if (principal == null) {
            log.warn("Dropping typing event without an authenticated principal");
            return;
        }
        String chatId = request == null ? null : request.chatId();
        if (chatId == null || chatId.isBlank()) {
            log.warn("Dropping typing event without a chat id from user {}", principal.getName());
            return;
        }
        ChatParticipants participants = chatRepository.findParticipantsByChatId(chatId).orElse(null);
        if (participants == null) {
            log.warn("Dropping typing event for unknown chat {} from user {}", chatId, principal.getName());
            return;
        }
        String senderId = principal.getName();
        String recipientId;
        if (senderId.equals(participants.senderId())) {
            recipientId = participants.recipientId();
        } else if (senderId.equals(participants.recipientId())) {
            recipientId = participants.senderId();
        } else {
            log.warn("Dropping typing event for chat {} from non-participant {}", chatId, senderId);
            return;
        }
        Notification notification = Notification.builder()
                .chatId(chatId)
                .senderId(senderId)
                .recipientId(recipientId)
                .type(NotificationType.TYPING)
                .build();
        notificationService.sendNotification(recipientId, notification);
    }
}
