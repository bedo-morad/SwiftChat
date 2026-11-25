export interface Notification {
  chatId?: string;
  content?: string;
  senderId?: string;
  recipientId?: string;
  messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
  type?: 'SEEN' | 'MESSAGE' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TYPING';
  chatName?: string;
  media?: Array<string>
}
