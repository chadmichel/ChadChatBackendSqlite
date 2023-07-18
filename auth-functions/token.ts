import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import '@fastify/jwt';

export function createToken(request: FastifyRequest, reply: FastifyReply) {
  // request.log.info('createToken');

  // request.log.debug('createToken request: ' + request.body);

  const body = request.body as any;
  const email = body.email;
  const id = body.id;
  const expiresOn = new Date();
  expiresOn.setDate(expiresOn.getDate() + 14); // add 14 days

  const token = reply.jwtSign({
    id: id,
    email: email,
    role: 'admin',
    expriesOn: expiresOn,
  });

  // request.log.info('createToken response: ' + token);

  return token;
}
