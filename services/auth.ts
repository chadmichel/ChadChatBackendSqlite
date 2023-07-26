import { FastifyReply, FastifyRequest } from 'fastify';
import { Context } from './context';
import { Logger } from './logger';

export class Auth {
  constructor(
    private logger: Logger,
    private context: Context,
    private request: FastifyRequest,
    private reply: FastifyReply
  ) {}
  dispose() {}

  public async createToken() {
    const userId = this.context.userId;

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

    this.logger.info(`createToken: ${token} for user ${userId} ${email}`);
    return token;
  }
}
