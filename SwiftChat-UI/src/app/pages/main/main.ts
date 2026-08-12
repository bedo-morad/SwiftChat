import {AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
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
import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import {Notification} from './notification';

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
export class Main implements OnInit, OnDestroy, AfterViewChecked {

  chats = signal<Array<ChatResponse>>([]);
  selectedChat = signal<ChatResponse>({});
  chatMessages = signal<MessageResponse[]>([]);
  showEmojis = signal(false);
  messageContent = ''
  socketClient: any = null;
  @ViewChild('scrollableDiv') scrollableDiv!: ElementRef<HTMLDivElement>;
  private notificationSubscription: any;

  constructor(
    private chatService: ChatService,
    private keycloakService: KeycloakService,
    private messageService: MessageService
  ) {
  }

  ngAfterViewChecked(): void {
    this.scrollBottom();
  }

  ngOnDestroy(): void {
    if (this.socketClient !== null) {
      this.socketClient.disconnect();
      this.notificationSubscription.unsubscribe();
      this.socketClient = null;
    }
  }

  ngOnInit(): void {
    this.initWebSocket();
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
    this.chats.update(chats => chats.some(chat => chat.Id === chatResponse.Id)
      ? chats.map(chat => chat.Id === chatResponse.Id ? {...chat, unreadCount: 0} : chat)
      : [{...chatResponse, unreadCount: 0}, ...chats]
    );
    this.getAllChatMessages(chatResponse.Id as string);
    this.setMessagesToSeen()
    this.selectedChat.update(chat => ({...chat, unreadCount: 0}));
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
    const file = this.extractFileFromTarget(target);
    if (file !== null) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const mediaLines = reader.result.toString().split(',')[1];
          this.messageService.uploadMessage({
            'chatId': this.selectedChat().Id as string,
            body: {
              file: file
            }
          }).subscribe({
            next: () => {
              const message: MessageResponse = {
                senderId: this.getSenderId(),
                recipientId: this.getRecipientId(),
                content: 'Attachment',
                type: "IMAGE",
                state: "SENT",
                media: [mediaLines],
                createdAt: new Date().toString()
              };
              this.chatMessages.update((messages) => [...messages, message]);
            }
          })
        }
      }
      reader.readAsDataURL(file);
    }
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
            return {...chat, lastMessage: this.messageContent, lastMessageTime: new Date().toString()};
          });
          this.updateChatPreview(this.selectedChat().Id as string, this.messageContent, false);
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

  private initWebSocket() {
    if (this.keycloakService.keycloak.tokenParsed?.sub) {
      let ws = new SockJS('http://localhost:8080/ws');
      this.socketClient = Stomp.over(ws)
      const subUrl = `/user/${this.keycloakService.keycloak.tokenParsed?.sub}/chat`
      this.socketClient.connect(
        {'Authorization': `Bearer ${this.keycloakService.keycloak.token}`},
        () => {
          this.notificationSubscription = this.socketClient.subscribe(
            subUrl,
            (message: any) => {
              console.log(message);
              const notification: Notification = JSON.parse(message.body);
              this.handleNotification(notification);
            },
            () => {
              console.log('Subscription failed');
            }
          );
        }
      )
    }
  }

  private handleNotification(notification: Notification) {
    if (!notification) return;
    if (this.selectedChat() && this.selectedChat().Id === notification.chatId) {
      switch (notification.type) {
        case 'MESSAGE':
        case 'IMAGE':
          const message: MessageResponse = {
            senderId: notification.senderId,
            recipientId: notification.recipientId,
            content: notification.content,
            type: notification.messageType,
            media: notification.media,
            createdAt: new Date().toString()
          };
          const lastMessage = notification.type === 'IMAGE' ? 'Attachment' : notification.content;
          this.selectedChat.update(chat => ({...chat, lastMessage, lastMessageTime: new Date().toString()}));
          this.updateChatPreview(notification.chatId as string, lastMessage, false);
          this.chatMessages.update((messages) => [...messages, message]);
          break;
        case 'SEEN':
          this.chatMessages.update(messages =>
            messages.map(message => ({...message, state: 'SEEN'}))
          );
          break;

      }
    } else {
      if (notification.type !== 'SEEN') {
        const lastMessage = notification.type === 'IMAGE' ? 'Attachment' : notification.content;
        const exists = this.chats().some(chat => chat.Id === notification.chatId);
        if (exists) {
          this.updateChatPreview(notification.chatId as string, lastMessage, true);
        } else if (notification.type === 'MESSAGE') {
          const newChat: ChatResponse = {
            Id: notification.chatId,
            senderId: notification.senderId,
            recipientId: notification.recipientId,
            lastMessage: notification.content,
            name: notification.chatName,
            unreadCount: 1,
            lastMessageTime: new Date().toString()
          };
          this.chats.update((chats) => [newChat, ...chats]);
        }
      }
    }
  }

  private updateChatPreview(chatId: string, lastMessage: string | undefined, incrementUnread: boolean): void {
    this.chats.update(chats => chats.map(chat =>
      chat.Id === chatId
        ? {
          ...chat,
          lastMessage,
          lastMessageTime: new Date().toString(),
          unreadCount: incrementUnread ? (chat.unreadCount ?? 0) + 1 : chat.unreadCount
        }
        : chat
    ));
  }

  private extractFileFromTarget(target: EventTarget | null): File | null {
    const htmlInputTarget = target as HTMLInputElement;
    if (target === null || htmlInputTarget.files === null) {
      return null;
    }
    return htmlInputTarget.files[0];
  }

  private scrollBottom() {
    if (this.scrollableDiv){
      const div = this.scrollableDiv.nativeElement;
      div.scrollTop = div.scrollHeight;
    }
  }
}
