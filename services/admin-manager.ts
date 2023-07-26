import { Context } from 'vm';
import { DatabaseAccess } from './Database-Access';
import { Logger } from './logger';

export class AdminManager {
  constructor(
    private logger: Logger,
    private context: Context,
    private databaseAccess: DatabaseAccess
  ) {}

  dispose() {}

  public async initSystem() {
    this.logger.info('begin: initSystem');

    this.databaseAccess.initSystem();

    this.logger.info('end: initSystem');
  }
}
