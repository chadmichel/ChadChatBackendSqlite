export interface ChatListItem {
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageBy: string;
  lastMessageById: string;
  lastMessageByAvatar: string;
  unreadMessageCount: number;
}
