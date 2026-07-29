package com.SwiftChat.SwiftChat.message;

import org.springframework.stereotype.Service;

@Service
public class MessageMapper {
    public MessageResponse toMessageResponse(Message message) {
        return MessageResponse.builder()
                .id(message.getId())
                .content(message.getContent())
                .type(message.getType())
                .senderId(message.getSenderId())
                .recipientId(message.getRecipientId())
                .state(message.getState())
                .createdAt(message.getCreatedDate())
                //todo get media file
                .build();
    }
}
