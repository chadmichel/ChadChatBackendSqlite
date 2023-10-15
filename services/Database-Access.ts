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
import { Errors } from '../dto/errors';
import { GenericUtil } from './generic-util';

export class DatabaseAccess {
  async initSystem() {
    await this.createTables();
  }
  constructor(
    private logger: Logger,
    private config: ConfigUtil,
    private context: Context,
    private sql: SqliteUtil,
    private generic: GenericUtil
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

  async user(userId: string): Promise<User> {
    var sql = 'select * from users where id = ?';
    var params = [userId];
    this.logger.debug('user: sql: ' + sql);

    const row = await this.sql.get<User>(sql, params);
    if (row) {
      this.logger.debug('user: row: ' + JSON.stringify(row));
      return row;
    }
    throw new Error(Errors.notFound);
  }

  async doesUserExist(email: string): Promise<boolean> {
    var sql = 'select * from users where email = ?';
    var params = [email];
    this.logger.debug('user: sql: ' + sql);

    try {
      const row = await this.sql.getArray<User>(sql, params);
      if (row.length > 0) {
        this.logger.debug('user: row: ' + JSON.stringify(row));
        return true;
      }
    } catch {}

    return false;
  }

  async userByEmail(email: string): Promise<User> {
    var sql = 'select * from users where email = ?';
    var params = [email];
    this.logger.debug('user: sql: ' + sql);

    const row = await this.sql.get<User>(sql, params);
    if (row) {
      this.logger.debug('user: row: ' + JSON.stringify(row));
      return row;
    }
    throw new Error(Errors.notFound);
  }

  async getUserIdByEmail(email: string): Promise<string> {
    var sql = 'select * from users where email = ?';
    var params = [email];
    this.logger.debug('user: sql: ' + sql);

    const rows = await this.sql.getArray<User>(sql, params);
    if (rows && rows.length > 0) {
      this.logger.debug('user: row: ' + JSON.stringify(rows));
      return rows[0].id;
    }
    throw new Error(Errors.notFound);
  }

  async upsertUser(user: User, id?: string): Promise<string> {
    if (!id && user.email) {
      const exists = await this.doesUserExist(user.email);
      if (exists) {
        const userId = await this.getUserIdByEmail(user.email);
        id = userId;
      }
    }

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
    this.logger.debug('chatUsers: sql: ' + sql);

    const rows = await this.sql.getArray<ChatUser>(sql, params);
    return rows;
  }

  async chatUser(chatId: string, userId: string): Promise<ChatUser> {
    var sql =
      'select u.id, u.email, cu.unread_message_count, u.name from users u inner join chat_users cu on u.id = cu.user_id where cu.chat_id = ? and cu.user_id = ? order by u.updated_at desc';
    var params = [];
    params.push(chatId);
    params.push(userId);
    this.logger.debug('chatUsers: sql: ' + sql);

    const row = await this.sql.get<ChatUser>(sql, params);
    return row;
  }

  async upsertChat(chat: ChatDetail, id?: string): Promise<string> {
    var guid = await this.sql.upsert('chats', chat, id);
    return guid;
  }

  async upsertChatUser(
    chatId: string,
    userIdorEmail: string,
    unreadMessageCount: number
  ): Promise<string> {
    let userId = '';
    if (this.generic.isEmail(userIdorEmail)) {
      userId = await this.upsertUser({
        email: userIdorEmail,
        name: userIdorEmail,
        role: 'user',
        avatar: '',
      });
    } else {
      userId = userIdorEmail;
    }
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

    // update other information
    await this.updateChatUserUnreadMessageCount(message.chatId);
    await this.updateChatLastMessage(message.chatId, message);

    return guid;
  }

  async updateChatLastMessage(chatId: string, message: Message) {
    const user = await this.user(message.userId);

    const sql =
      'update chats set last_message = ?, last_message_at = ?, last_message_by = ?, last_message_by_id = ?, last_message_by_avatar = ? where id = ?';
    const params = [] as any[];
    params.push(message.message);
    params.push(message.timestamp);
    params.push(user.email);
    params.push(message.userId);
    params.push(user.avatar);
    params.push(chatId);

    await this.sql.runScript(sql, params as []);
  }

  async updateChatUserUnreadMessageCount(chatId: string): Promise<string> {
    const sql =
      'update chat_users set unread_message_count = unread_message_count + 1 where chat_id = ?';
    const params = [chatId] as any[];

    await this.sql.runScript(sql, params as []);

    return chatId;
  }

  async chatMessage(messageId: string): Promise<Message> {
    var sql = 'select * from messages where id = ?';
    var params = [messageId];
    this.logger.debug('chatMessage: sql: ' + sql);

    const row = await this.sql.get<Message>(sql, params);
    if (row) {
      this.logger.debug('chatMessage: row: ' + JSON.stringify(row));
      return row;
    }
    throw new Error(Errors.notFound);
  }

  async chatMessages(chatId: string): Promise<ListItem<MessageListItem>[]> {
    var sql =
      'select m.*, u.email, u.name, u.avatar from messages m join users u on u.id = m.user_id where chat_id = ? order by timestamp desc';
    var params = [chatId];

    return this.sql.getArray<MessageListItem>(sql, params);

    // var promise = new Promise<ListItem<MessageListItem>[]>(
    //   (resolve, reject) => {
    //     this.logger.debug('chatMessages: sql: ' + sql);

    //     this.sql.getArray<MessageListItem>(sql, params).then((rows) => {
    //       this.logger.debug('chatMessages: rows: ' + JSON.stringify(rows));
    //       resolve(rows);
    //     });
    //   }
    // );
    // return promise;
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
