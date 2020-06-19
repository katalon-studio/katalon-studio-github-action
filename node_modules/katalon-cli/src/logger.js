const log4js = require('log4js');
const utils = require('./utils');

const logConfigs = {
  appenders: {
    access: {
      type: 'dateFile',
      filename: utils.getPath('log/access.log'),
      pattern: '-yyyy-MM-dd',
      category: 'http',
    },
    out: { type: 'stdout' },
    app: {
      type: 'file',
      filename: utils.getPath('log/app.log'),
      maxLogSize: 10485760,
      numBackups: 3,
    },
    errorFile: {
      type: 'file',
      filename: utils.getPath('log/errors.log'),
    },
    errors: {
      type: 'logLevelFilter',
      level: 'ERROR',
      appender: 'errorFile',
    },
  },
  categories: {
    default: { appenders: ['app', 'errors', 'out'], level: 'INFO' },
  },
};

log4js.configure(logConfigs);
const logger = log4js.getLogger('katalon');

module.exports = logger;
