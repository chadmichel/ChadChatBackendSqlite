import { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigUtil } from './Config-Util';
import { DatabaseAccess } from './Database-Access';
import { Context } from './context';
import { Auth } from './auth';
import { AdminManager } from './admin-manager';
import { Logger } from './logger';
import { ChatManager } from './chat-manager';
import { SqliteUtil } from './sqlite-util';

export interface Services {
  logger: Logger;
  context: Context;
  config: ConfigUtil;
  auth: Auth;
  sqlite: SqliteUtil;

  databaseAccess: DatabaseAccess;

  adminManager: AdminManager;
  chatManager: ChatManager;
}
