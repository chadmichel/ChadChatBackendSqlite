import { AwilixContainer } from 'awilix';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Services } from '../services/Services';
import { DatabaseAccess } from '../services/Database-Access';

export async function initSystem(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AwilixContainer<Services>
) {
  request.log.info('begin: initSystem');

  const db = services.resolve<DatabaseAccess>('databaseAccess');
  db.createTables();

  request.log.info('end: initSystem');
  return {
    status: 'ok',
  };
}
