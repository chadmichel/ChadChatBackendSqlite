import { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigUtil } from './Config-Util';
import { DatabaseAccess } from './Database-Access';
import { Context } from './context';

export interface Services {
  context: Context;
  databaseAccess: DatabaseAccess;
  config: ConfigUtil;

  request: FastifyRequest;
  reply: FastifyReply;
}
