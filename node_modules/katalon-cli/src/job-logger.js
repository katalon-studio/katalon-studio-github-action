const winston = require('winston');
const { stringify } = require('./utils');

function formatter({ level, message, timestamp, metadata }) {
  const metaStr = `${metadata.stack || stringify(metadata)}`;
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr && `\n${metaStr}`}`;
}

const winstonLogFormat = winston.format.combine(
  winston.format.align(),
  winston.format.splat(),
  winston.format.metadata(),
  winston.format.timestamp(),
  winston.format.printf(formatter),
);

const logger = {
  getLogger(filename) {
    return winston.createLogger({
      level: 'debug',
      format: winstonLogFormat,
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename }),
      ],
    });
  },
};

module.exports = logger;
