import { ChatUser } from './chat-user';

export interface ChatDetail {
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageBy: string;
  lastMessageById: string;
  lastMessageByAvatar: string;

  chatUsers: ChatUser[];
}
