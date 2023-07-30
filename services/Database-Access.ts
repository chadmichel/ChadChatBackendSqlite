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
import { ChatUser } from '../dto/chat-user';

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

  dbPath() {
    return this.config.dbBasePath + '/' + this.context.tenantId + '.db';
  }

  async createTables() {
    this.logger.debug('create tables: userid = ' + this.context.userId);
    this.logger.debug('create tables: path = ' + this.config.dbBasePath);

    await this.sql.runScript(
      'create table if not exists users (id text primary key, name text not null, email text not null, password text not null, role text not null, created_at text not null, updated_at text not null);'
    );
    await this.sql.runScript(
      'create table if not exists chats (id text primary key, name text not null, created_at text not null, updated_at text not null, last_message text, last_message_at, last_message_by, last_message_by_id, last_message_by_avatar);'
    );
    await this.sql.runScript(
      'create table if not exists messages (id text primary key, chat_id text not null, user_id text not null, message text not null, created_at text not null, updated_at text not null);'
    );
    await this.sql.runScript(
      'create table if not exists chat_users (id text primary key, chat_id text not null, user_id text not null, created_at text not null, updated_at text not null, unread_message_count not null);'
    );
  }

  async upsertUser(user: User, id?: string): Promise<string> {
    var guid = await this.sql.upsert('users', user, id);
    return guid;
  }

  async chatsForUser(userId: string): Promise<ListItem<ChatListItem>[]> {
    var sql =
      'select chats.*, cu.unread_message_count from chats inner join chat_users cu on chats.id = cu.chat_id where cu.user_id = ?';
    var params = [userId];
    var promise = new Promise<ListItem<ChatListItem>[]>((resolve, reject) => {
      this.logger.debug('chatsForUser: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('chatsForUser: rows: ' + JSON.stringify(rows));
          const rowsCasted = this.sql.mapToTSArray<ChatListItem>(rows);
          resolve(rowsCasted);
        }
      });
    });
    return promise;
  }

  async chatDetail(chatId: string): Promise<ChatDetail> {
    var sql = 'select * from chats where id = ?';
    var params = [chatId];
    var promise = new Promise<ChatDetail>((resolve, reject) => {
      this.logger.debug('chatDetail: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.get(sql, params, (err, row) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('chatDetail: row: ' + JSON.stringify(row));
          const rowCasted = this.sql.mapToTS<ChatDetail>(row);
          resolve(rowCasted);
        }
      });
    });
    return promise;
  }

  async chatUsers(chatId: string): Promise<ListItem<ChatUser>[]> {
    var sql =
      'select u.id, u.email, cu.unread_message_count from users u inner join chat_users cu on u.id = cu.user_id where cu.chat_id = ?';
    var params = [chatId];
    var promise = new Promise<ListItem<ChatUser>[]>((resolve, reject) => {
      this.logger.debug('chatUsers: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('chatUsers: rows: ' + JSON.stringify(rows));
          const rowsCasted = this.sql.mapToTSArray<ChatUser>(rows);
          resolve(rowsCasted);
        }
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

    const user = await this.sql.selectSQL<ChatUser>(sql, params as []);
    if (!user || user.length == 0) {
      return this.sql.upsert('chat_users', chatUser);
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
}
