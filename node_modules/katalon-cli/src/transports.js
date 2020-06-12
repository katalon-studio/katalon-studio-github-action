const _ = require('lodash');
const TransportStream = require('winston-transport');
const { MESSAGE } = require('triple-beam');

const katalonHttp = require('./http');
const katalonRequest = require('./katalon-request');

class S3FileTransport extends TransportStream {
  constructor(options = {}, afterLog) {
    super(options);
    this.filePath = options.filePath;
    this.signedUrl = options.signedUrl;
    this.parentLogger = options.logger;

    this.wait = options.wait;
    this.afterLog = afterLog;

    this.uploadToS3 = this.uploadToS3.bind(this);
    this.uploadToS3Throttled = _.throttle(this.uploadToS3, this.wait, { trailing: false });
  }

  uploadToS3(info, callback) {
    try {
      return katalonHttp
        .uploadToS3(this.signedUrl, this.filePath)
        .then(() => this.afterLog && this.afterLog())
        .catch((error) => this._handleError(error));
    } catch (error) {
      this._handleError(error);
      return null;
    }
  }

  log(info, callback) {
    this.uploadToS3Throttled(info, callback);
    if (callback) {
      callback();
    }
  }

  _handleError(error) {
    this.parentLogger.error('Error caught during logging:', error);
  }
}

class S3BufferTransport extends TransportStream {
  constructor(options = {}, projectId, topic) {
    super(options);
    this.filePath = options.filePath;
    this.signedUrl = options.signedUrl;
    this.parentLogger = options.logger;
    this.wait = options.wait;

    this.contentBuffer = '';
    this.projectId = projectId;
    this.topic = topic;

    this.streamToS3 = this.streamToS3.bind(this);
    this.streamToS3Throttled = _.throttle(this.streamToS3, this.wait);
  }

  streamToS3(info, callback) {
    this.contentBuffer += `${info[MESSAGE]}\n`;
    try {
      return katalonHttp
        .streamToS3(this.signedUrl, this.contentBuffer)
        .then(() => katalonRequest.sendTrigger(this.projectId, this.topic))
        .catch((error) => this._handleError(error));
    } catch (error) {
      this._handleError(error);
      return null;
    }
  }

  log(info, callback) {
    this.streamToS3(info, callback);
    if (callback) {
      callback();
    }
  }

  _handleError(error) {
    this.parentLogger.error('Error caught during logging:', error);
  }
}

module.exports.S3FileTransport = S3FileTransport;
module.exports.S3BufferTransport = S3BufferTransport;
