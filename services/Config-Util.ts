const config = require('config');

export class ConfigUtil {
  constructor() {}
  dispose() {}

  public dbBasePath = config.get('dbBasePath');
}
