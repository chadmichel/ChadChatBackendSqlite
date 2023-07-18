import { AwilixContainer } from 'awilix';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Services } from '../services/Services';

export async function init(
  request: FastifyRequest,
  reply: FastifyReply,
  services: AwilixContainer<Services>
) {
  request.log.info('init');

  const token = request.headers.token;
  const userId = request.headers.userId;
  const email = request.headers.userEmaill;

  var expiresOn = new Date();
  expiresOn.setDate(expiresOn.getDate() + 14); // add 14 days

  var response = {
    token: token,
    expiresOn: expiresOn,
    userId: userId,
    email: email,
  };
  var resposneString = JSON.stringify(response);
  request.log.info('init response: ' + resposneString);
  return response;
}
