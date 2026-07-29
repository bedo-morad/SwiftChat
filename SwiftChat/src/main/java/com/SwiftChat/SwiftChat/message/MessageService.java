package com.SwiftChat.SwiftChat.message;

import com.SwiftChat.SwiftChat.chat.Chat;
import com.SwiftChat.SwiftChat.chat.ChatRepository;
import com.SwiftChat.SwiftChat.file.FileService;
import com.SwiftChat.SwiftChat.file.FileUtils;
import com.SwiftChat.SwiftChat.notification.Notification;
import com.SwiftChat.SwiftChat.notification.NotificationService;
import com.SwiftChat.SwiftChat.notification.NotificationType;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final MessageMapper messageMapper;
    private final FileService fileService;
    private final NotificationService notificationService;

    public void saveMessage(MessageRequest messageRequest) {
        Chat chat = chatRepository.findById(messageRequest.getChatId())
                .orElseThrow(() -> new EntityNotFoundException("Chat with id " + messageRequest.getChatId() + " not found"));
        Message message = new Message();
        message.setContent(messageRequest.getContent());
        message.setChat(chat);
        message.setSenderId(messageRequest.getSenderId());
        message.setRecipientId(messageRequest.getRecipientId());
        message.setType(messageRequest.getMessageType());
        message.setState(MessageState.SENT);

        messageRepository.save(message);
        Notification notification = Notification.builder()
                .chatId(chat.getId())
                .messageType(message.getType())
                .content(message.getContent())
                .senderId(message.getSenderId())
                .recipientId(message.getRecipientId())
                .type(NotificationType.MESSAGE)
                .chatName(chat.getChatName(message.getSenderId()))
                .build();
        notificationService.sendNotification(message.getRecipientId(), notification);
    }

    public List<MessageResponse> findChatMessages(String chatId) {
        return messageRepository.findMessagesByChatId(chatId)
                .stream()
                .map(messageMapper::toMessageResponse)
                .toList();
    }

    @Transactional
    public void setMessagesToSeen(String chatId, Authentication authentication) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat with id " + chatId + " not found"));
        final String recipientId = getRecipientId(chat, authentication);
        messageRepository.setMessagesToSeenByChat(chat.getId(), MessageState.SEEN);
        Notification notification = Notification.builder()
                .chatId(chat.getId())
                .senderId(getSenderId(chat, authentication))
                .recipientId(recipientId)
                .type(NotificationType.SEEN)
                .build();
        notificationService.sendNotification(recipientId, notification);
    }

    public void uploadMessageMedia(String chatId, MultipartFile file, Authentication authentication) {
        Chat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new EntityNotFoundException("Chat with id " + chatId + " not found"));
        final String senderId = getSenderId(chat, authentication);
        final String recipientId = getRecipientId(chat, authentication);

        final String filePath = fileService.saveFile(file, senderId);

        Message message = new Message();
        message.setChat(chat);
        message.setSenderId(senderId);
        message.setRecipientId(recipientId);
        message.setType(MessageType.IMAGE);
        message.setState(MessageState.SENT);
        message.setMediaFilePath(filePath);
        messageRepository.save(message);
        Notification notification = Notification.builder()
                .chatId(chat.getId())
                .messageType(MessageType.IMAGE)
                .senderId(senderId)
                .recipientId(recipientId)
                .type(NotificationType.IMAGE)
                .media(FileUtils.readFileFromLocation(filePath))
                .build();
        notificationService.sendNotification(recipientId, notification);
    }

    private String getSenderId(Chat chat, Authentication authentication) {
        if (chat.getSender().getId().equals(authentication.getName())) {
            return chat.getSender().getId();
        }
        return chat.getRecipient().getId();
    }

    private String getRecipientId(Chat chat, Authentication authentication) {
        if (chat.getSender().getId().equals(authentication.getName())) {
            return chat.getRecipient().getId();
        }
        return chat.getSender().getId();
    }
}
