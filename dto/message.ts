export interface Message {
  chatId: string;
  userId: string;
  message: string;
  timestamp: number;
}

export interface MessageListItem {
  chatId: string;
  userId: string;
  message: string;
  timestamp: number;

  userName: string;
  userAvatar: string;
}
