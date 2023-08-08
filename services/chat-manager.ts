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
import {
  ApiUpdateResponse,
  createSuccessApiUpdateReponse,
} from '../dto/api-update-response';
import { ChatUser } from '../dto/chat-user';
import {
  ApiDeleteResponse,
  createSuccessApiDeleteReponse,
} from '../dto/api-delete-response';
import { Message } from '../dto/message';

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
    const $top = this.context.params.$top;
    const $skip = this.context.params.$skip;

    var chats = await this.databaseAccess.chatsForUser(
      this.context.userId,
      $top,
      $skip
    );

    const response = createSuccessApiArrayResponse<ChatListItem>(
      chats,
      this.context
    );
    return response;
  }

  public async getChat(): Promise<ApiItemResponse> {
    const id = this.context.params.id;
    var chat = await this.databaseAccess.chatDetail(id);

    var chatUsers = await this.databaseAccess.chatUsers(id);
    chat.chatUsers = chatUsers.map((x) => {
      return {
        userId: x.id,
        name: x.data.name,
        email: x.data.email,
      };
    });

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

  public async updateChat(): Promise<ApiUpdateResponse> {
    const chat = this.context.body as ChatDetail;
    const id = this.context.params.id;

    const chatId = await this.databaseAccess.upsertChat(chat, id);

    await this.databaseAccess.upsertChatUser(chatId, this.context.userId, 0);

    if (chat.chatUsers) {
      for (var user of chat.chatUsers) {
        var userId = await this.databaseAccess.upsertChatUser(
          chatId,
          user.userId,
          0
        );
      }
    }
    const response = createSuccessApiUpdateReponse(chatId, this.context);
    return response;
  }

  public async chatUsers(): Promise<ApiArrayResponse<ChatUser>> {
    const id = this.context.params.id;
    const users = await this.databaseAccess.chatUsers(id);
    const chatUsers = users.map((x) => {
      return {
        id: x.id,
        data: {
          name: x.data.name,
          email: x.data.email,
          unreadMessageCount: x.data.unreadMessageCount,
        },
      };
    }) as ListItem<ChatUser>[];

    const response = createSuccessApiArrayResponse<ChatUser>(
      chatUsers,
      this.context
    );
    return response;
  }

  public async chatUser(): Promise<ApiItemResponse> {
    const chatId = this.context.params.id;
    const userId = this.context.params.userId;

    const chatUsers = await this.databaseAccess.chatUsers(chatId);
    const chatUser = chatUsers.find((x) => x.id == userId);

    const response = createSuccessApiItemReponse(
      chatUser?.data,
      userId,
      this.context
    );
    return response;
  }

  public async insertChatUser(): Promise<ApiInsertResponse> {
    const chatId = this.context.params.id;
    const chatUser = this.context.body as ChatUser;

    this.logger.debug(`insertChatUsers: ${JSON.stringify(chatUser)} ${chatId}`);
    const id = await this.databaseAccess.upsertChatUser(
      chatId,
      chatUser.userId,
      0
    );

    const response = createSuccessApiInsertReponse(
      chatUser.userId,
      this.context
    );
    return response;
  }

  public async updateChatUser(): Promise<ApiInsertResponse> {
    const chatId = this.context.params.id;
    const userId: string = this.context.params.userId;

    const chatUser = this.context.body as ChatUser;

    this.logger.debug(`updateChatUser: ${JSON.stringify(chatUser)} ${chatId}`);
    const id = await this.databaseAccess.upsertChatUser(
      chatId,
      userId,
      chatUser.unreadMessageCount ?? 0
    );

    const response = createSuccessApiInsertReponse(userId, this.context);
    return response;
  }

  public async deleteChatUser(): Promise<ApiDeleteResponse> {
    const chatId = this.context.params.id;
    const userId: string = this.context.params.userId;

    this.logger.debug(`deleteChatUser: ${chatId} ${userId}`);
    const id = await this.databaseAccess.deleteChatUser(chatId, userId);

    const response = createSuccessApiDeleteReponse(userId, this.context);
    return response;
  }

  public async chatMessages(): Promise<ApiArrayResponse<Message>> {
    const chatId = this.context.params.id;
    const messages = await this.databaseAccess.chatMessages(chatId);

    const response = createSuccessApiArrayResponse<Message>(
      messages,
      this.context
    );
    return response;
  }

  public async chatMessage(): Promise<ApiItemResponse> {
    const messageId = this.context.params.messageId;
    const message = await this.databaseAccess.chatMessage(messageId);

    const response = createSuccessApiItemReponse(
      message,
      messageId,
      this.context
    );
    return response;
  }

  public async insertChatMessage(): Promise<ApiInsertResponse> {
    const chatId = this.context.params.id;
    const message = this.context.body as Message;
    message.userId = this.context.userId;
    message.chatId = chatId;
    message.timestamp = new Date().getTime();

    const id = await this.databaseAccess.upsertMessage(message);

    await this.databaseAccess.updateChatUserUnreadMessageCount(chatId);

    const response = createSuccessApiInsertReponse(id, this.context);
    return response;
  }

  public async updateChatMessage(): Promise<ApiInsertResponse> {
    const chatId = this.context.params.id;
    const message = this.context.body as Message;
    message.userId = this.context.userId;
    message.chatId = chatId;
    message.timestamp = new Date().getTime();
    const messageId = this.context.params.messageId;

    const id = await this.databaseAccess.upsertMessage(message, messageId);

    const response = createSuccessApiUpdateReponse(id, this.context);
    return response;
  }
}
