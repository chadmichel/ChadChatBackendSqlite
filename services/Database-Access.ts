import fastify from 'fastify';
import { ConfigUtil } from './Config-Util';
import { Database } from 'sqlite3';
import { Context } from './context';

export class DatabaseAccess {
  async initSystem() {
    await this.createTables();
  }
  constructor(private config: ConfigUtil, private context: Context) {}
  public testMe() {
    return 'DatabaseAccess';
  }
  dispose() {}

  async runScript(script: string) {
    var promise = new Promise((resolve, reject) => {
      console.log('runScript; script: ' + script);
      const db = new Database(this.config.dbBasePath);

      db.run(script, (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log('script run successfully');
          resolve(null);
        }
      });
    });
    return promise;
  }

  async createTables() {
    console.log('userid = ' + this.context.userId);
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
