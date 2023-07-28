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
import { ChatManager } from './services/chat-manager';

const server = fastify();

const currentApiVersion = '/v1/:tenantId';

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
    tenantId: (request.params as any).tenantId,
    requestUrl: request.url,
    fullUrl: request.hostname + request.url,
    body: request.body,
    params: request.params,
  } as Context;

  if (user) {
    context = {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      token: request.headers.token,
      requestId: uuidv4(),
      requestHandler: requestHandler,
      tenantId: (request.params as any).tenantId,
      requestUrl: request.url,
      fullUrl: request.hostname + request.url,
      body: request.body,
      params: request.params,
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
  const chatManager = new ChatManager(logger, context, databaseAccess);

  const services = {
    logger: logger,
    config: configUtil,
    context: context,
    auth: auth,
    databaseAccess: databaseAccess,
    adminManager: adminManager,
    chatManager: chatManager,
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

const publicGet = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.get(currentApiVersion + route, async (request, reply) => {
    const services = buildServices(route, request, reply);
    return await handler(services);
  });
};

const authenticatedGet = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.get(
    currentApiVersion + route,
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const start = new Date();
      const services = buildServices(route, request, reply);
      services.logger.debug('authenticatedGet: ' + route);
      const response = await handler(services);
      const end = new Date();
      services.logger.debug(
        'authenticatedGet: ' +
          route +
          ' response: ' +
          response +
          ' duration: ' +
          (end.getTime() - start.getTime() + 'ms')
      );
      return response;
    }
  );
};

const authenticatedPost = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.post(
    currentApiVersion + route,
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const start = new Date();
      const services = buildServices(route, request, reply);
      services.logger.debug('authenticatedPost: ' + route);
      const response = await handler(services);
      const end = new Date();
      services.logger.debug(
        'authenticatedPost: ' +
          route +
          ' response: ' +
          response +
          ' duration: ' +
          (end.getTime() - start.getTime() + 'ms')
      );
      return response;
    }
  );
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

// PUBLIC ROUTES
publicGet('/build', async (services) => {
  return '2023-07-13';
});

// INIT USER
authenticatedPost('/users', async (services) => {
  return await services.chatManager.createUser();
});

// AUTH ROUTES
server.post(
  currentApiVersion + '/auth/token',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const services = buildServices('/auth/token', request, reply);
    return services.auth.createToken();
  }
);

// CHAT ROUTES
authenticatedGet('/chats', async (services) => {
  return await services.chatManager.getChats();
});
authenticatedPost('/chats', async (services) => {
  return await services.chatManager.insertChat();
});

// ADMIN ROUTES
adminPost('/admin/initsystem', async (services) => {
  return await services.adminManager.initSystem();
});

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
