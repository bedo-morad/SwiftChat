import {Component, input, InputSignal, output, signal} from '@angular/core';
import {ChatResponse} from '../../services/models/chat-response';
import {DatePipe} from '@angular/common';
import {UserResponse} from '../../services/models/user-response';
import {UserService} from '../../services/services/user.service';
import {ChatService} from '../../services/services/chat.service';
import {KeycloakService} from '../../utils/keycloak/keycloak-service';

@Component({
  selector: 'app-chat-list',
  imports: [
    DatePipe
  ],
  templateUrl: './chat-list.html',
  styleUrl: './chat-list.scss',
})
export class ChatList {
  chats: InputSignal<ChatResponse[]> = input<ChatResponse[]>([]);
  selectedChatId = input<string>();
  searchNewContact = signal(false);
  contacts = signal<Array<UserResponse>>([]);
  chatSelected = output<ChatResponse>();
  constructor(
    private userService: UserService,
    private chatService: ChatService,
    private keycloakService:KeycloakService
  ) {

  }

  protected searchContact() {
    this.userService.getAllUsersExceptSelf()
    .subscribe({
      next: (users) => {
        this.contacts.set(users);
        this.searchNewContact.set(true);
      }
    })
  }

  protected chatClicked(chat: ChatResponse) {
    this.chatSelected.emit(chat);
  }

  protected wrapMessage(lastMessage: string | undefined):string {
    if (lastMessage && lastMessage.length <= 20) {
      return lastMessage;
    }
    return lastMessage?.substring(0, 17) + '...';
  }

  protected selectContact(contact: UserResponse) {
    this.chatService.createChat({
      "senderId": this.keycloakService.userId as string,
      "recipientId": contact.id as string
    }).subscribe({
      next: (res) => {
        const chat : ChatResponse = {
          Id: res.response,
          name: contact.firstName + ' ' + contact.lastName,
          recipientOnline: contact.online,
          lastMessageTime: contact.lastSeen,
          senderId: this.keycloakService.userId,
          recipientId: contact.id
        }
        this.searchNewContact.set(false);
        this.chatSelected.emit(chat);
      }
    })
  }
}
