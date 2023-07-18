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

const server = fastify();

const currentApiVersion = '/v1';

// plugin configuration
server.register(fastifyAwilixPlugin, {
  disposeOnClose: true,
  disposeOnResponse: true,
});

// register services
const container = createContainer<Services>({
  injectionMode: InjectionMode.CLASSIC,
});
container.register({
  context: asFunction(() => {
    return new Context();
  }).scoped(),
  config: asClass(ConfigUtil),
  databaseAccess: asClass(DatabaseAccess),
});

server.register(require('@fastify/jwt'), {
  secret: 'SECRET',
});

server.addHook('onRequest', async (request, reply, done) => {
  // //request.diScope.createScope();
  // request.diScope.register({
  //   context: asFunction(() => {
  //     return new Context();
  //   }).scoped(),
  //   config: asClass(ConfigUtil),
  //   databaseAccess: asClass(DatabaseAccess),
  //   auth: asClass(Auth),
  //   request: asFunction(() => {
  //     request;
  //   }),
  //   reply: asFunction(() => {
  //     reply;
  //   }),
  // });
  // var context = request.diScope.resolve<Context>('context');
  // context.userId = 'blah';
  // //done();
});

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
    return await initSystem(request, reply, container);
  }
);

server.post(
  currentApiVersion + '/auth/token',
  async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.diScope.resolve<Auth>('auth');
    return auth.createToken();
    //return createToken(request, reply);
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
