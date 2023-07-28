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
import { User } from '../dto/user';
import {
  ApiItemResponse,
  createSuccessApiItemReponse,
} from '../dto/api-item-response';

export class ChatManager {
  constructor(
    private logger: Logger,
    private context: Context,
    private databaseAccess: DatabaseAccess
  ) {}

  dispose() {}

  public async createUser(): Promise<ApiInsertResponse> {
    const user = this.context.body as User;
    const id = this.context.params.id;

    const userId = await this.databaseAccess.upsertUser(user, id);

    const response = createSuccessApiInsertReponse(userId, this.context);
    return response;
  }

  public async getChats(): Promise<ApiArrayResponse<ChatListItem>> {
    var chats = await this.databaseAccess.chatsForUser(this.context.userId);

    const response = createSuccessApiArrayResponse<ChatListItem>(
      chats,
      this.context
    );
    return response;
  }

  public async getChat(): Promise<ApiItemResponse> {
    const id = this.context.params.id;
    var chat = await this.databaseAccess.chatDetail(id);

    const response = createSuccessApiItemReponse(chat, id, this.context);
    return response;
  }

  public async insertChat(): Promise<ApiInsertResponse> {
    const chat = this.context.body as ChatDetail;

    const chatId = await this.databaseAccess.upsertChat(chat);

    await this.databaseAccess.upsertChatUser(chatId, this.context.userId, 0);

    const response = createSuccessApiInsertReponse(chatId, this.context);
    return response;
  }
}
