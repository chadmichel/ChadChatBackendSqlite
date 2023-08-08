import fastify from 'fastify';
import { ConfigUtil } from './Config-Util';
import { Database } from 'sqlite3';
import { Context } from './context';
import { Logger } from './logger';
import { ChatListItem } from '../dto/chat-list-item';
import { v4 as uuidv4 } from 'uuid';
import { ChatDetail } from '../dto/chat-detail';
import { ListItem } from '../dto/list-item';
import { User } from '../dto/user';
import { SqliteUtil } from './sqlite-util';
import { ChatUser, ChatUserDb } from '../dto/chat-user';
import { Message, MessageListItem } from '../dto/message';

export class DatabaseAccess {
  async initSystem() {
    await this.createTables();
  }
  constructor(
    private logger: Logger,
    private config: ConfigUtil,
    private context: Context,
    private sql: SqliteUtil
  ) {}

  dispose() {}

  async createTables() {
    this.logger.debug('create tables: userid = ' + this.context.userId);
    this.logger.debug('create tables: path = ' + this.config.dbBasePath);

    await this.sql.runScript(
      'create table if not exists users (id text primary key, name text not null, email text not null, role text not null, avatar, created_at text not null, updated_at text not null);'
    );
    await this.sql.runScript(
      'create table if not exists chats (id text primary key, name text not null, created_at text not null, updated_at text not null, last_message text, last_message_at, last_message_by, last_message_by_id, last_message_by_avatar);'
    );
    await this.sql.runScript(
      'create table if not exists messages (id text primary key, chat_id text not null, user_id text not null, message text not null, timestamp not null, created_at text not null, updated_at text not null);'
    );
    await this.sql.runScript(
      'create table if not exists chat_users (id text primary key, chat_id text not null, user_id text not null, created_at text not null, updated_at text not null, unread_message_count not null);'
    );
  }

  async upsertUser(user: User, id?: string): Promise<string> {
    var guid = await this.sql.upsert('users', user, id);
    return guid;
  }

  async chatsForUser(
    userId: string,
    $top: number,
    $skip: number
  ): Promise<ListItem<ChatListItem>[]> {
    var sql =
      'select chats.*, cu.unread_message_count from chats inner join chat_users cu on chats.id = cu.chat_id where cu.user_id = ?';
    var params = [userId];
    var promise = new Promise<ListItem<ChatListItem>[]>((resolve, reject) => {
      this.logger.debug('chatsForUser: sql: ' + sql);

      this.sql
        .getArrayPaged<ChatListItem>(sql, params, $top, $skip, false)
        .then((rows) => {
          this.logger.debug('chatsForUser: rows: ' + JSON.stringify(rows));
          resolve(rows);
        });
    });
    return promise;
  }

  async chatDetail(chatId: string): Promise<ChatDetail> {
    var sql = 'select * from chats where id = ?';
    var params = [chatId];
    var promise = new Promise<ChatDetail>((resolve, reject) => {
      this.logger.debug('chatDetail: sql: ' + sql);

      this.sql.get<ChatDetail>(sql, params).then((rows) => {
        this.logger.debug('chatDetail: row: ' + JSON.stringify(rows));
        resolve(rows);
      });
    });
    return promise;
  }

  async chatUsers(chatId: string): Promise<ListItem<ChatUser>[]> {
    var sql =
      'select u.id, u.email, cu.unread_message_count, u.name from users u inner join chat_users cu on u.id = cu.user_id where cu.chat_id = ? order by u.updated_at desc';
    var params = [chatId];
    var promise = new Promise<ListItem<ChatUser>[]>((resolve, reject) => {
      this.logger.debug('chatUsers: sql: ' + sql);

      this.sql.getArray<ChatUser>(sql, params).then((rows) => {
        this.logger.debug('chatUsers: rows: ' + JSON.stringify(rows));
        resolve(rows);
      });
    });

    return promise;
  }

  async upsertChat(chat: ChatDetail, id?: string): Promise<string> {
    var guid = await this.sql.upsert('chats', chat, id);
    return guid;
  }

  async upsertChatUser(
    chatId: string,
    userId: string,
    unreadMessageCount: number
  ): Promise<string> {
    const chatUser = {
      chatId: chatId,
      userId: userId,
      unreadMessageCount: unreadMessageCount,
    };

    const sql = 'select * from chat_users where chat_id = ? and user_id = ?';
    const params = [] as any[];
    params.push(chatId);
    params.push(userId);

    const user = await this.sql.selectSQL<ChatUserDb>(sql, params as []);
    if (!user || user.length == 0) {
      return this.sql.upsert('chat_users', chatUser);
    } else {
      return this.sql.upsert('chat_users', chatUser, user[0].id);
    }
    return '';
  }

  async deleteChatUser(chatId: string, userId: string): Promise<string> {
    const sql = 'delete from chat_users where chat_id = ? and user_id = ?';
    const params = [] as any[];
    params.push(chatId);
    params.push(userId);

    await this.sql.runScript(sql, params as []);

    return userId;
  }

  async upsertMessage(message: Message, id?: string): Promise<string> {
    var guid = await this.sql.upsert('messages', message, id);
    return guid;
  }

  async updateChatUserUnreadMessageCount(messageId: string): Promise<string> {
    const sql =
      'update chat_users set unread_message_count = unread_message_count + 1 where chat_id = (select chat_id from messages where id = ?)';
    const params = [messageId] as any[];
    params.push(messageId);

    await this.sql.runScript(sql, params as []);

    return messageId;
  }

  async chatMessage(messageId: string): Promise<Message> {
    var sql = 'select * from messages where id = ?';
    var params = [messageId];
    var promise = new Promise<Message>((resolve, reject) => {
      this.logger.debug('chatMessage: sql: ' + sql);

      this.sql.get<Message>(sql, params).then((row) => {
        if (row) {
          this.logger.debug('chatMessage: row: ' + JSON.stringify(row));
          resolve(row);
        } else {
          reject('chatMessage: row not found');
        }
      });
    });
    return promise;
  }

  async chatMessages(chatId: string): Promise<ListItem<MessageListItem>[]> {
    var sql =
      'select m.*, u.email, u.name, u.avatar from messages m join users u on u.id = m.user_id where chat_id = ? order by timestamp desc';
    var params = [chatId];
    var promise = new Promise<ListItem<MessageListItem>[]>(
      (resolve, reject) => {
        this.logger.debug('chatMessages: sql: ' + sql);

        this.sql.getArray<MessageListItem>(sql, params).then((rows) => {
          this.logger.debug('chatMessages: rows: ' + JSON.stringify(rows));
          resolve(rows);
        });
      }
    );
    return promise;
  }

  async records(
    tableName: string,
    $top: number,
    $skip: number
  ): Promise<any[]> {
    var sql = 'select * from ' + tableName + ' order by updated_at desc';
    var params = [] as any[];
    var promise = new Promise<any[]>((resolve, reject) => {
      this.logger.debug('records: sql: ' + sql);

      this.sql
        .getArrayPaged<any>(sql, params, $top ?? 1000, $skip ?? 0, true)
        .then((rows) => {
          this.logger.debug('records: rows: ' + JSON.stringify(rows));
          resolve(rows);
        });
    });
    return promise;
  }
}
