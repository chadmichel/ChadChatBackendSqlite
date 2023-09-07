import { ConfigUtil } from './Config-Util';
import { Database } from 'sqlite3';
import { Context } from './context';
import { Logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import { ListItem } from '../dto/list-item';
import { Errors } from '../dto/errors';

export class SqliteUtil {
  constructor(
    private logger: Logger,
    private config: ConfigUtil,
    private context: Context
  ) {}

  maxPageSize = 1000;

  dbPath() {
    return this.config.dbBasePath + '/' + this.context.tenantId + '.db';
  }

  async getArrayPaged<T>(
    sql: string,
    params: string[],
    $top: number,
    $skip: number,
    addTimestamps: boolean
  ): Promise<ListItem<T>[]> {
    if (!$top) {
      $top = this.maxPageSize;
    }
    if (!$skip) {
      $skip = 0;
    }

    var promise = new Promise<ListItem<T>[]>((resolve, reject) => {
      if ($top > this.maxPageSize) {
        $top = this.maxPageSize;
      }

      var offset = $skip;
      var pageSize = $top;
      sql = sql + ' limit ' + pageSize + ' offset ' + offset;

      this.logger.debug('getArrayPaged: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, row) => {
        if (err) {
          this.logger.error(err.toString());
          reject(Errors.notFound);
        } else {
          this.logger.debug('get: row: ' + JSON.stringify(row));
          const rowCasted = this.mapToTSArray<T>(row, addTimestamps);
          resolve(rowCasted);
        }
      });
    });
    return promise;
  }

  async getArray<T>(sql: string, params: string[]): Promise<ListItem<T>[]> {
    var promise = new Promise<ListItem<T>[]>((resolve, reject) => {
      sql = sql + ' limit ' + this.maxPageSize;

      this.logger.debug('getArray: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, row) => {
        if (err) {
          this.logger.error(err.toString());
          reject(Errors.notFound);
        } else {
          this.logger.debug('get: row: ' + JSON.stringify(row));
          if (row && row.length > 0) {
            const rowCasted = this.mapToTSArray<T>(row);
            resolve(rowCasted);
          } else {
            reject(Errors.notFound);
          }
        }
      });
    });
    return promise;
  }

  async get<T>(sql: string, params: string[]): Promise<T> {
    var promise = new Promise<T>((resolve, reject) => {
      this.logger.debug('get: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.get(sql, params, async (err, row) => {
        if (err) {
          this.logger.error(err.toString());
          reject(Errors.notFound);
        } else {
          this.logger.debug('get: row: ' + JSON.stringify(row));
          const rowCasted = this.mapToTS<T>(row);
          if (rowCasted) {
            resolve(rowCasted);
          } else {
            reject(Errors.notFound);
          }
        }
      });
    });
    return promise;
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

  async listAllTables(): Promise<string[]> {
    var promise = new Promise<string[]>((resolve, reject) => {
      const sql = 'select name from sqlite_master where type = ?';
      const params = ['table'];

      this.logger.debug('listAllTables: sql: ' + sql);
      const db = new Database(this.dbPath());

      db.all(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(err.toString());
          reject(err);
        } else {
          this.logger.debug('listAllTables: rows: ' + JSON.stringify(rows));
          resolve(rows.map((x: any) => x.name));
        }
      });
    });
    return promise;
  }

  mapToTSArray<T>(rows: any, addTimestamps = false): ListItem<T>[] {
    var arr = [] as ListItem<T>[];

    if (!Array.isArray(rows)) {
      rows = [rows];
    }
    rows.forEach((row: any) => {
      var listItem = {
        id: row.id,
        data: this.mapToTS<T>(row, addTimestamps),
      } as ListItem<T>;
      arr.push(listItem);
    });

    return arr;
  }

  mapToTS<T>(row: any, addTimestamps = false): T | undefined {
    if (row) {
      let obj = {} as any;
      const columns = Object.keys(row);
      const formattedColumns = columns.map((column) => {
        const words = column.split('_');
        const capitalizedWords = words.map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1)
        );
        const tsProp = capitalizedWords.join('');
        var lowerProp = tsProp.charAt(0).toLowerCase() + tsProp.slice(1);
        if (addTimestamps) {
          if (tsProp != 'Id') {
            obj[lowerProp] = row[column];
          }
        } else {
          if (
            tsProp != 'Id' &&
            tsProp != 'CreatedAt' &&
            tsProp != 'UpdatedAt'
          ) {
            obj[lowerProp] = row[column];
          }
        }
      });
      return obj as T;
    }
    return undefined;
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
