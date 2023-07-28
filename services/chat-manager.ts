import { DatabaseAccess } from './Database-Access';
import { Logger } from './logger';
import {
  ApiArrayResponse,
  createSuccessApiArrayResponse,
} from '../dto/api-array-response';
import { ChatListItem } from '../dto/chat-list-item';
import { Context } from './context';
import { ListItem } from '../dto/list-item';
import { ChatDetail } from '../dto/chat-detail';
import {
  ApiInsertResponse,
  createSuccessApiInsertReponse,
} from '../dto/api-insert-response';

export class ChatManager {
  constructor(
    private logger: Logger,
    private context: Context,
    private databaseAccess: DatabaseAccess
  ) {}

  dispose() {}

  public async getChats(): Promise<ApiArrayResponse<ChatListItem>> {
    var chats = await this.databaseAccess.chatsForUser(this.context.userId);

    const response = createSuccessApiArrayResponse<ChatListItem>(
      chats,
      this.context
    );
    return response;
  }

  public async insertChat(): Promise<ApiInsertResponse> {
    const chat = this.context.body as ChatDetail;

    const chatId = await this.databaseAccess.insertChat(chat);

    const response = createSuccessApiInsertReponse(chatId, this.context);
    return response;
  }
}
