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
import { SqliteUtil } from './services/sqlite-util';
import { ApiResponse } from './dto/api-resposne';
import { createGenericResponse } from './dto/response-generic';
import { RawManager } from './services/raw-manager';
import cors from '@fastify/cors';
import { GenericUtil } from './services/generic-util';

const server = fastify();

const currentApiVersion = '/api/chat/v1';

server.register(cors, {
  origin: '*',
  methods: ['GET', 'PUT', 'POST', 'DELETE'],
});

server.register(require('@fastify/jwt'), {
  secret: 'SECRET',
});

function buildContext(
  requestHandler: string,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as any;
  const tenantId = (request.headers as any).tenantId ?? 'default';
  let context = {
    userId: '',
    userEmail: '',
    role: 'anonymous',
    requestId: uuidv4(),
    requestHandler: requestHandler,
    token: '',
    tenantId: tenantId,
    requestUrl: request.url,
    fullUrl: request.hostname + request.url,
    body: request.body,
    params: request.params,
    queryParams: request.query,
  } as Context;

  if (user) {
    context = {
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      token: request.headers.token,
      requestId: uuidv4(),
      requestHandler: requestHandler,
      tenantId: tenantId,
      requestUrl: request.url,
      fullUrl: request.hostname + request.url,
      body: request.body,
      params: request.params,
      queryParams: request.query,
    } as Context;
  }
  return context;
}

function buildServices(
  requestHandler: string,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const generic = new GenericUtil();
  const logger = new Logger(request);

  const context = buildContext(requestHandler, request, reply);

  const configUtil = new ConfigUtil();

  const sqlite = new SqliteUtil(logger, configUtil, context);

  const databaseAccess = new DatabaseAccess(
    logger,
    configUtil,
    context,
    sqlite,
    generic
  );

  const auth = new Auth(logger, context, request, reply, databaseAccess);

  const rawManager = new RawManager(logger, context, databaseAccess, sqlite);
  const adminManager = new AdminManager(logger, context, databaseAccess);
  const chatManager = new ChatManager(logger, context, databaseAccess);

  const services = {
    generic: generic,
    logger: logger,
    config: configUtil,
    context: context,
    auth: auth,
    databaseAccess: databaseAccess,
    adminManager: adminManager,
    chatManager: chatManager,
    rawManager: rawManager,
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

function mapResponse(response: ApiResponse, reply: FastifyReply) {
  reply.code(response.status);
}

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

      try {
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

        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
      return {};
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
      try {
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
        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
    }
  );
};

const authenticatedPut = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.put(
    currentApiVersion + route,
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const start = new Date();
      const services = buildServices(route, request, reply);
      try {
        services.logger.debug('authenticatedPut: ' + route);
        const response = await handler(services);
        const end = new Date();
        services.logger.debug(
          'authenticatedPut: ' +
            route +
            ' response: ' +
            response +
            ' duration: ' +
            (end.getTime() - start.getTime() + 'ms')
        );
        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
    }
  );
};

const authenticatedDelete = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.delete(
    currentApiVersion + route,
    {
      onRequest: [authenticate],
    },
    async (request, reply) => {
      const start = new Date();
      const services = buildServices(route, request, reply);
      try {
        services.logger.debug('authenticatedDelete: ' + route);
        const response = await handler(services);
        const end = new Date();
        services.logger.debug(
          'authenticatedDelete: ' +
            route +
            ' response: ' +
            response +
            ' duration: ' +
            (end.getTime() - start.getTime() + 'ms')
        );
        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
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
      const start = new Date();
      const services = buildServices(route, request, reply);
      try {
        const response = await handler(services);
        const end = new Date();
        services.logger.debug(
          'adminGet: ' +
            route +
            ' response: ' +
            response +
            ' duration:  ' +
            (end.getTime() - start.getTime() + 'ms')
        );
        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
    }
  );
};

const adminGet = function (
  route: string,
  handler: (services: Services) => Promise<any>
) {
  server.get(
    currentApiVersion + route,
    {
      onRequest: [authenticateAdmin],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const start = new Date();
      const services = buildServices(route, request, reply);
      try {
        services.logger.debug('adminGet: ' + route);

        const response = await handler(services);
        const end = new Date();
        services.logger.debug(
          'adminGet: ' +
            route +
            ' response: ' +
            response +
            ' duration:  ' +
            (end.getTime() - start.getTime() + 'ms')
        );
        mapResponse(response, reply);
        return response;
      } catch (ex: any) {
        services.logger.error(ex!.toString());
        let status = 500;
        if (ex.toLowerCase().includes('not found')) {
          status = 404;
        } else if (ex.toLowerCase().includes('not authorized')) {
          status = 401;
        }

        reply.code(status);
        return {
          status: status,
          error: ex.toString(),
          message: 'failure',
          request: createGenericResponse(services.context),
        };
      }
    }
  );
};

// PUBLIC ROUTES
publicGet('/build', async (services) => {
  return '2023-08-08';
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
authenticatedGet('/chats/:id', async (services) => {
  return await services.chatManager.getChat();
});
authenticatedPost('/chats', async (services) => {
  return await services.chatManager.insertChat();
});
authenticatedPut('/chats/:id', async (services) => {
  return await services.chatManager.updateChat();
});
authenticatedGet('/chats/:id/users', async (services) => {
  return await services.chatManager.chatUsers();
});
authenticatedGet('/chats/:id/users/:userId', async (services) => {
  return await services.chatManager.chatUser();
});
authenticatedPost('/chats/:id/users', async (services) => {
  return await services.chatManager.insertChatUser();
});
authenticatedPut('/chats/:id/users/:userId', async (services) => {
  return await services.chatManager.updateChatUser();
});
authenticatedDelete('/chats/:id/users/:userId', async (services) => {
  return await services.chatManager.deleteChatUser();
});

authenticatedGet('/chats/:id/messages', async (services) => {
  return await services.chatManager.chatMessages();
});
authenticatedGet('/chats/:id/messages/:messageId', async (services) => {
  return await services.chatManager.chatMessage();
});
authenticatedPost('/chats/:id/messages', async (services) => {
  return await services.chatManager.insertChatMessage();
});
authenticatedPut('/chats/:id/messages/:messageId', async (services) => {
  return await services.chatManager.updateChatMessage();
});

// ADMIN ROUTES
adminPost('/admin/initsystem', async (services) => {
  return await services.adminManager.initSystem();
});

adminGet('/admin/messages', async (services) => {
  return await services.adminManager.auditMessages();
});

adminGet('/admin/chats', async (services) => {
  return await services.adminManager.auditChats();
});

adminGet('/admin/users', async (services) => {
  return await services.adminManager.auditUsers();
});

adminGet('/debug/tables', async (services) => {
  return await services.rawManager.tables();
});

adminGet('/debug/tables/:table', async (services) => {
  return await services.rawManager.table();
});

server.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  console.log(error);
  reply.status(404);
});

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
