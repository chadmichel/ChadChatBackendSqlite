import { ConfigUtil } from './Config-Util';
import { Database } from 'sqlite3';
import { Context } from './context';
import { Logger } from './logger';
import { ChatListItem } from '../dto/chat-list-item';
import { v4 as uuidv4 } from 'uuid';
import { ChatDetail } from '../dto/chat-detail';
import { ListItem } from '../dto/list-item';
import { User } from '../dto/user';

export class SqliteUtil {
  constructor(
    private logger: Logger,
    private config: ConfigUtil,
    private context: Context
  ) {}

  dbPath() {
    return this.config.dbBasePath + '/' + this.context.tenantId + '.db';
  }

  async runScript(script: string, params?: any[]) {
    var promise = new Promise((resolve, reject) => {
      this.logger.debug('runScript: script: ' + script);
      const db = new Database(this.dbPath());

      db.run(script, params, (err) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('script run successfully');
          resolve(null);
        }
      });
    });
    return promise;
  }

  async upsert(
    tableName: string,
    insertObj: any,
    guid?: string
  ): Promise<string> {
    if (!guid) {
      guid = uuidv4();
    }
    const obj = this.mapToDb(insertObj);

    if (!obj.created_at) {
      obj.created_at = new Date().toISOString();
    }
    obj.updated_at = new Date().toISOString();

    var sql = 'insert into ' + tableName + ' (';
    var values = ' values (';
    var params = [] as any[];

    const columns = Object.keys(obj);

    sql += 'id,';
    params.push(guid);
    values += '?,';

    const formattedColumns = columns.map((column) => {
      sql += column + ',';
      values += '?,';
      params.push(obj[column]);
    });

    sql = sql.substring(0, sql.length - 1);
    values = values.substring(0, values.length - 1);
    sql += ')';
    values += ')';
    sql += values;
    sql += ' on conflict(id) do update set ';
    const formattedColumns2 = columns.map((column) => {
      sql += column + ' = ?,';
      params.push(obj[column]);
    });
    sql = sql.substring(0, sql.length - 1);
    sql += ' where id = ?';
    params.push(guid);

    var promise = new Promise<string>((resolve, reject) => {
      this.logger.debug('upsert: sql: ' + sql);
      this.logger.debug('upsert: params: ' + JSON.stringify(params));

      const db = new Database(this.dbPath());

      let debugSql = sql;
      params.forEach((param) => {
        debugSql = debugSql.replace('?', "'" + param + "'");
      });
      this.logger.debug('upsert: debugSql: ' + debugSql);

      db.run(sql, params, (err) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('upsert: success');
          resolve(guid as string);
        }
      });
    });
    return promise;
  }

  async selectSQL<T>(sql: string, params: []): Promise<ListItem<T>[]> {
    var promise = new Promise<ListItem<T>[]>((resolve, reject) => {
      this.logger.debug('selectSQL: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('selectSQL: rows: ' + JSON.stringify(rows));
          const rowsCasted = this.mapToTSArray<T>(rows);
          resolve(rowsCasted);
        }
      });
    });
    return promise;
  }

  async selectAll<T>(tableName: string): Promise<ListItem<T>[]> {
    var sql = 'select * from ' + tableName;
    var promise = new Promise<ListItem<T>[]>((resolve, reject) => {
      this.logger.debug('selectAll: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, (err, rows) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('selectAll: rows: ' + JSON.stringify(rows));
          const rowsCasted = this.mapToTSArray<T>(rows);
          resolve(rowsCasted);
        }
      });
    });
    return promise;
  }

  mapToTSArray<T>(rows: any): ListItem<T>[] {
    var arr = [] as ListItem<T>[];
    rows.forEach((row: any) => {
      var listItem = {
        id: row.id,
        data: this.mapToTS<T>(row),
      } as ListItem<T>;
      arr.push(listItem);
    });
    return arr;
  }

  mapToTS<T>(row: any): T {
    let obj = {} as any;
    const columns = Object.keys(row);
    const formattedColumns = columns.map((column) => {
      const words = column.split('_');
      const capitalizedWords = words.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1)
      );
      const tsProp = capitalizedWords.join('');
      var lowerProp = tsProp.charAt(0).toLowerCase() + tsProp.slice(1);
      if (tsProp != 'Id' && tsProp != 'CreatedAt' && tsProp != 'UpdatedAt') {
        obj[lowerProp] = row[column];
      }
    });
    return obj as T;
  }

  mapToDbArray<T>(arr: any): any {
    var rows = [] as T[];
    arr.forEach((obj: any) => {
      rows.push(this.mapToDb<T>(obj));
    });
    return rows;
  }

  mapToDb<T>(obj: any): any {
    let row = {} as any;

    const newObj = Object.keys(obj)
      .filter((key) => !Array.isArray(obj[key]))
      .reduce((acc, key) => {
        (acc as any)[key] = obj[key];
        return acc;
      }, {}) as any;

    const columns = Object.keys(newObj);
    const formattedColumns = columns.map((column) => {
      const words = column.split(/(?=[A-Z])/);
      const lowerCaseWords = words.map((word) => word.toLowerCase());
      const dbProp = lowerCaseWords.join('_');
      row[dbProp] = newObj[column];
    });
    return row as T;
  }
}
