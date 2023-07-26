import fastify from 'fastify';
import { ConfigUtil } from './Config-Util';
import { Database } from 'sqlite3';
import { Context } from './context';
import { Logger } from './logger';

export class DatabaseAccess {
  async initSystem() {
    await this.createTables();
  }
  constructor(
    private logger: Logger,
    private config: ConfigUtil,
    private context: Context
  ) {}
  public testMe() {
    return 'DatabaseAccess';
  }
  dispose() {}

  dbPath() {
    return this.config.dbBasePath + '/' + this.context.tenantId + '.db';
  }

  async runScript(script: string) {
    var promise = new Promise((resolve, reject) => {
      this.logger.debug('runScript: script: ' + script);
      const db = new Database(this.dbPath());

      db.run(script, (err) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('script run successfully');
          resolve(null);
        }
      });
    });
    return promise;
  }

  async createTables() {
    this.logger.debug('create tables: userid = ' + this.context.userId);
    this.logger.debug('create tables: path = ' + this.config.dbBasePath);

    await this.runScript(
      'create table if not exists users (id text primary key, name text not null, email text not null, password text not null, role text not null, created_at text not null, updated_at text not null);'
    );
    await this.runScript(
      'create table if not exists tokens (id text primary key, user_id integer not null, token text not null, created_at text not null, updated_at text not null);'
    );
    await this.runScript(
      'create table if not exists chats (id text primary key, name text not null, created_at text not null, updated_at text not null, last_message text, last_message_at);'
    );
    await this.runScript(
      'create table if not exists messages (id text primary key, chat_id text not null, user_id text not null, message text not null, created_at text not null, updated_at text not null);'
    );
    await this.runScript(
      'create table if not exists chat_users (id text primary key, chat_id text not null, user_id text not null, created_at text not null, updated_at text not null);'
    );
  }
}
