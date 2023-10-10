import { FastifyReply, FastifyRequest } from 'fastify';
import { Context } from './context';
import { Logger } from './logger';
import { DatabaseAccess } from './Database-Access';
import { SqliteUtil } from './sqlite-util';

export class Auth {
  constructor(
    private logger: Logger,
    private context: Context,
    private request: FastifyRequest,
    private reply: FastifyReply,
    private databaseAccess: DatabaseAccess
  ) {}
  dispose() {}

  public async createToken() {
    const body = this.request.body as any;
    const email = body.email;

    const exists = await this.databaseAccess.doesUserExist(email);

    let userId = '';

    if (exists) {
      userId = await this.databaseAccess.getUserIdByEmail(email);
    } else {
      this.logger.info(`createToken: user ${email} not found`);
      userId = await this.databaseAccess.upsertUser({
        email: email,
        name: email,
        role: 'admin',
      });
    }

    const expiresOn = new Date();
    expiresOn.setDate(expiresOn.getDate() + 14); // add 14 days

    const token = await this.reply.jwtSign({
      id: userId,
      email: email,
      role: 'admin',
      expriesOn: expiresOn,
    });

    this.logger.info(`createToken: ${token} for user ${userId} ${email}`);
    return {
      token: token,
      expiresOn: expiresOn,
      email: email,
      userId: userId,
      loginDate: new Date(),
    };
  }
}
