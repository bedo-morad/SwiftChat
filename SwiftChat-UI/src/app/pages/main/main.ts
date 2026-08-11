import {Component, OnInit, signal} from '@angular/core';
import {ChatList} from '../chat-list/chat-list';
import {ChatResponse} from '../../services/models/chat-response';
import {ChatService} from '../../services/services/chat.service';
import {KeycloakService} from '../../utils/keycloak/keycloak-service';
import {MessageService} from '../../services/services/message.service';
import {MessageResponse} from '../../services/models/message-response';
import {DatePipe} from '@angular/common';
import {PickerComponent} from '@ctrl/ngx-emoji-mart';
import {FormsModule} from '@angular/forms';
import {EmojiData} from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {MessageRequest} from '../../services/models/message-request';

@Component({
  selector: 'app-main',
  imports: [
    ChatList,
    DatePipe,
    PickerComponent,
    FormsModule
  ],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main implements OnInit {

  chats = signal<Array<ChatResponse>>([]);
  selectedChat = signal<ChatResponse>({});
  chatMessages = signal<MessageResponse[]>([]);
  showEmojis = signal(false);
  messageContent = ''

  constructor(
    private chatService: ChatService,
    private keycloakService: KeycloakService,
    private messageService: MessageService
  ) {
  }

  ngOnInit(): void {
    this.getAllChats();
  }

  private getAllChats(): void {
    this.chatService.getChatsByRecipientId()
      .subscribe({
        next: (res) => {
          this.chats.set(res);
        }
      })
  }

  protected logout() {
    this.keycloakService.logout();
  }

  protected userProfile() {
    this.keycloakService.accountManagement();
  }

  protected chatSelected(chatResponse: ChatResponse) {
    this.selectedChat.set(chatResponse);
    this.getAllChatMessages(chatResponse.Id as string);
    this.setMessagesToSeen()
    this.selectedChat.update(value => {
      value.unreadCount = 0;
      return value;
    })
  }

  private getAllChatMessages(chatId: string) {
    this.messageService.getMessagesByChatId({
      'chatId': chatId,
    }).subscribe({
      next: (messages) => {
        this.chatMessages.set(messages);
      }
    })
  }

  private setMessagesToSeen() {
    this.messageService.setMessagesToSeen({
      'chatId': this.selectedChat().Id as string
    }).subscribe({
      next: () => {
      }
    })
  }

  isSelfMessage(message: MessageResponse): boolean {
    return message.senderId === this.keycloakService.userId;
  }

  protected uploadMedia(target: EventTarget | null) {

  }

  protected onSelectEmoji(selectedEmoji: any) {
    const emoji: EmojiData = selectedEmoji.emoji;
    this.messageContent += emoji.native
  }

  protected keyDown(keyboardEvent: KeyboardEvent) {
    if (keyboardEvent.key === 'Enter') {
      this.sendMessage()
    }
  }

  protected onClick() {
    this.setMessagesToSeen()
  }

  protected sendMessage() {
    if (this.messageContent) {
      const messageRequest: MessageRequest = {
        chatId: this.selectedChat().Id,
        senderId: this.getSenderId(),
        recipientId: this.getRecipientId(),
        content: this.messageContent,
        messageType: "TEXT"
      }
      this.messageService.saveMessage({
        body: messageRequest
      }).subscribe({
        next: () => {
          const message: MessageResponse = {
            senderId: this.getSenderId(),
            recipientId: this.getRecipientId(),
            content: this.messageContent,
            type: "TEXT",
            state: "SENT",
            createdAt: new Date().toString()
          }
          this.selectedChat.update((chat) => {
            chat.lastMessage = this.messageContent;
            return chat;
          });
          this.chatMessages.update((messages) => [...messages, message]);
          this.messageContent = '';
          this.showEmojis.set(false);
        }
      })
    }
  }

  private getSenderId(): string {
    if (this.selectedChat().senderId === this.keycloakService.userId) {
      return this.selectedChat().senderId as string;
    }
    return this.selectedChat().recipientId as string;
  }

  private getRecipientId(): string {
    if (this.selectedChat().senderId === this.keycloakService.userId) {
      return this.selectedChat().recipientId as string;
    }
    return this.selectedChat().senderId as string;
  }
}
