import { DatabaseAccess } from './Database-Access';
import { Logger } from './logger';
import { MessageListItem } from '../dto/message';
import { RawRecordListItem } from '../dto/raw-record';
import { createSuccessApiArrayResponse } from '../dto/api-array-response';
import { Context } from './context';

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

  public async auditMessages() {
    const $top = this.context.params.$top;
    const $skip = this.context.params.$skip;

    var messages = await this.databaseAccess.records('messages', $top, $skip);

    const response = createSuccessApiArrayResponse<RawRecordListItem>(
      messages,
      this.context
    );
    return response;
  }

  public async auditChats() {
    const $top = this.context.params.$top;
    const $skip = this.context.params.$skip;

    var messages = await this.databaseAccess.records('chats', $top, $skip);

    const response = createSuccessApiArrayResponse<RawRecordListItem>(
      messages,
      this.context
    );
    return response;
  }

  public async auditUsers() {
    const $top = this.context.queryParams.$top ?? 100;
    const $skip = this.context.queryParams.$skip ?? 0;

    var messages = await this.databaseAccess.records('users', $top, $skip);

    const response = createSuccessApiArrayResponse<RawRecordListItem>(
      messages,
      this.context
    );
    return response;
  }
}
