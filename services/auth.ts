import { FastifyReply, FastifyRequest } from 'fastify';
import { Context } from './context';

export class Auth {
  constructor(
    private context: Context,
    private request: FastifyRequest,
    private reply: FastifyReply
  ) {}
  dispose() {}

  public async createToken() {
    // request.log.info('createToken');

    // request.log.debug('createToken request: ' + request.body);
    const context = this.request.diScope.resolve<Context>('context');
    const userId = context.userId;

    const body = this.request.body as any;
    const email = body.email;
    const id = body.id;
    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + 14); // add 14 days

    const token = this.reply.jwtSign({
      id: id,
      email: email,
      role: 'admin',
      expriesOn: expiresOn,
    });

    // request.log.info('createToken response: ' + token);
    return token;
  }
}
