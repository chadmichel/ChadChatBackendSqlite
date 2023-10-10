import { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigUtil } from './Config-Util';
import { DatabaseAccess } from './Database-Access';
import { Context } from './context';
import { Auth } from './auth';
import { AdminManager } from './admin-manager';
import { Logger } from './logger';
import { ChatManager } from './chat-manager';
import { SqliteUtil } from './sqlite-util';
import { RawManager } from './raw-manager';
import { GenericUtil } from './generic-util';

export interface Services {
  // utilities
  generic: GenericUtil;
  logger: Logger;
  context: Context;
  config: ConfigUtil;
  auth: Auth;
  sqlite: SqliteUtil;

  // access
  databaseAccess: DatabaseAccess;

  // managers
  rawManager: RawManager;
  adminManager: AdminManager;
  chatManager: ChatManager;
}
