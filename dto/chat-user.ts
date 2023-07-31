export interface ChatUser {
  userId: string;
  name: string;
  email: string;
  unreadMessageCount?: number;
}

export interface ChatUserDb {
  id: string;
  userId: string;
  chatId: string;
  unreadMessageCount?: number;
}
