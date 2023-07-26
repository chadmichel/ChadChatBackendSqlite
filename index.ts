import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { IncomingMessage } from 'http';
import { init } from './functions/Init';
import { initSystem } from './admin-functions/init-system';
import { createToken } from './auth-functions/token';
import { diContainer, fastifyAwilixPlugin } from '@fastify/awilix';
import {
  InjectionMode,
  Lifetime,
  asClass,
  asFunction,
  createContainer,
} from 'awilix';
import { DatabaseAccess } from './services/Database-Access';
import { Services } from './services/Services';
import { ConfigUtil } from './services/Config-Util';
import { Context } from './services/context';
import { Auth } from './services/auth';
import { v4 as uuidv4 } from 'uuid';
import { AdminManager } from './services/admin-manager';
import { Logger } from './services/logger';

const server = fastify();

const currentApiVersion = '/v1';

server.register(require('@fastify/jwt'), {
  secret: 'SECRET',
});

function buildContext(
  requestHandler: string,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any;
  let context = {
    userId: '',
    userEmail: '',
    role: 'anonymous',
    requestId: uuidv4(),
    requestHandler: requestHandler,
    token: '',
    tenantId: 'default',
  } as Context;

  if (user) {
    context = {
      userId: '',
      userEmail: user.email,
      role: user.role,
      token: request.headers.token,
      requestId: uuidv4(),
      requestHandler: requestHandler,
      tenantId: 'default',
    } as Context;
  }
  return context;
}

function buildServices(
  requestHandler: string,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const logger = new Logger(request);

  const context = buildContext(requestHandler, request, reply);

  const configUtil = new ConfigUtil();
  const auth = new Auth(logger, context, request, reply);

  const databaseAccess = new DatabaseAccess(logger, configUtil, context);

  const adminManager = new AdminManager(logger, context, databaseAccess);

  const services = {
    logger: logger,
    config: configUtil,
    context: context,
    auth: auth,
    databaseAccess: databaseAccess,
    adminManager: adminManager,
  } as Services;
  return services;
}

const authenticate = async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
};

const authenticateAdmin = async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'admin' && request.user.role !== 'superadmin') {
      reply.send(new Error('Not an admin'));
    }
  } catch (err) {
    reply.send(err);
  }
};

const adminPost = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.post(
    currentApiVersion + route,
    {
      onRequest: [authenticateAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const services = buildServices(route, request, reply);
      return await handler(services);
    }
  );
};

server.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  console.log(error);
  reply.send(error);
});

server.get('/build', async (request, reply) => {
  return '2023-07-13';
});

server.post(
  currentApiVersion + '/admin/initsystem',
  {
    onRequest: [authenticateAdmin],
  },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const services = buildServices('/admin/initSystem', request, reply);
    return await services.adminManager.initSystem();
  }
);

server.post(
  currentApiVersion + '/auth/token',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const services = buildServices('/auth/token', request, reply);
    return services.auth.createToken();
  }
);

// server.post(
//   currentApiVersion + '/init',
//   async (request: FastifyRequest, reply: FastifyReply) => {
//     return init(request, reply);
//   }
// );

// server.get(
//   currentApiVersion + '/conversations',
//   async (request: FastifyRequest, reply: FastifyReply) => {
//     return init(request, reply);
//   }
// );

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
