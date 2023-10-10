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
  createErrorNotFoundApiItemReponse,
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

    if (chat.chatUsers?.length > 0) {
      this.logger.debug('adding other users to chat');

      for (var user of chat.chatUsers) {
        if (typeof user === 'string') {
          // API allows for passing in of user as just an email address.
          const userEmail = user as string;
          this.logger.debug(`adding user ${userEmail} to chat`);
          if (userEmail === this.context.userEmail) {
            continue; // do not add existing user to chat
          }
          var userId = await this.databaseAccess.upsertChatUser(
            chatId,
            userEmail,
            0
          );
        } else if (user.userId === this.context.userId) {
          continue; // do not add existing user to chat
        } else if (user.userId?.length > 0) {
          // if we got a user id from the API use it
          this.logger.debug(`adding user ${user.userId} to chat`);
          var userId = await this.databaseAccess.upsertChatUser(
            chatId,
            user.userId,
            0
          );
        } else if (user.email?.length > 0) {
          // if we got an email address from the API use it
          this.logger.debug(`adding user ${user.email} to chat`);
          var userId = await this.databaseAccess.upsertChatUser(
            chatId,
            user.email,
            0
          );
        }
      }
    }

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

    const chatUser = await this.databaseAccess.chatUser(chatId, userId);

    const response = createSuccessApiItemReponse(
      chatUser,
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

    let response = createErrorNotFoundApiItemReponse(
      'Message not found',
      messageId,
      this.context
    );

    const message = await this.databaseAccess.chatMessage(messageId);

    if (message) {
      response = createSuccessApiItemReponse(message, messageId, this.context);
    }

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
