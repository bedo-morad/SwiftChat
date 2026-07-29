package com.SwiftChat.SwiftChat.message;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageRequest {
    private String content;
    private String senderId;
    private String recipientId;
    private MessageType messageType;
    private String chatId;
}
