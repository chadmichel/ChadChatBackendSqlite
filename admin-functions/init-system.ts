import { AwilixContainer } from 'awilix';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Services } from '../services/Services';
import { DatabaseAccess } from '../services/Database-Access';

export async function initSystem(request: FastifyRequest, reply: FastifyReply) {
  request.log.info('begin: initSystem');

  request.log.info('end: initSystem');
  return {
    status: 'ok',
  };
}
