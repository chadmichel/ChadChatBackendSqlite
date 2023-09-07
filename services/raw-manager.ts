import { DatabaseAccess } from './Database-Access';
import { Logger } from './logger';
import {
  ApiArrayResponse,
  createErrorApiArrayResponse,
  createSuccessApiArrayResponse,
  createSuccessApiArrayResponseRange,
} from '../dto/api-array-response';
import { ChatListItem } from '../dto/chat-list-item';
import { Context } from './context';
import { ListItem } from '../dto/list-item';
import { ChatDetail } from '../dto/chat-detail';
import {
  ApiInsertResponse,
  createSuccessApiInsertReponse,
} from '../dto/api-insert-response';
import { User } from '../dto/user';
import {
  ApiItemResponse,
  createErrorApiItemReponse,
  createErrorNotFoundApiItemReponse,
  createSuccessApiItemReponse,
} from '../dto/api-item-response';
import {
  ApiUpdateResponse,
  createSuccessApiUpdateReponse,
} from '../dto/api-update-response';
import { ChatUser } from '../dto/chat-user';
import {
  ApiDeleteResponse,
  createSuccessApiDeleteReponse,
} from '../dto/api-delete-response';
import { Message } from '../dto/message';
import { RawRecordListItem } from '../dto/raw-record';
import { SqliteUtil } from './sqlite-util';
import {
  LookupItem,
  createSuccessApiLookupResponse,
} from '../dto/api-lookup-response';

export class RawManager {
  constructor(
    private logger: Logger,
    private context: Context,
    private databaseAccess: DatabaseAccess,
    private sql: SqliteUtil
  ) {}

  dispose() {}

  public async table() {
    try {
      const $top = this.context.queryParams.$top;
      const $skip = this.context.queryParams.$skip;
      const table = this.context.params.table;

      const records = await this.databaseAccess.records(table, $top, $skip);
      const response = createSuccessApiArrayResponseRange<RawRecordListItem>(
        records,
        $top,
        $skip,
        this.context
      );
      return response;
    } catch (error: any) {
      this.logger.error(error.toString());
    }
    return createErrorApiArrayResponse(this.context);
  }

  public async tables() {
    try {
      const tables = await this.sql.listAllTables();
      const tablesLookup = tables.map((t) => {
        return { id: t, text: t };
      }) as LookupItem[];
      return createSuccessApiLookupResponse(tablesLookup, this.context);
    } catch (error: any) {
      this.logger.error(error.toString());
    }
  }
}
