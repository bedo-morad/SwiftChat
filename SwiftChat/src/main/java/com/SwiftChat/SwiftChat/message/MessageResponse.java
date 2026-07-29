package com.SwiftChat.SwiftChat.message;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MessageResponse {

    private Long id;
    private String content;
    private MessageState state;
    private MessageType type;
    private String senderId;
    private String recipientId;
    private LocalDateTime createdAt;
    private byte[] media;

}
