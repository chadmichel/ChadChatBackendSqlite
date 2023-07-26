import { FastifyReply, FastifyRequest } from 'fastify';

export class Logger {
  constructor(private request: FastifyRequest) {}
  dispose() {}

  public info(message: string) {
    console.log(message);
    this.request.log.info(message);
  }

  public debug(message: string) {
    console.log(message);
    this.request.log.debug(message);
  }

  public error(message: string) {
    console.log(message);
    this.request.log.error(message);
  }
}
