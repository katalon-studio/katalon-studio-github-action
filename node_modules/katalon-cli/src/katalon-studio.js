const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const http = require('./http');
const defaultLogger = require('./logger');
const os = require('./os');
const { KatalonStudioDownloader } = require('./remote-downloader');
const utils = require('./utils');

const releasesList =
  'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

function find(startPath, filter, callback) {
  if (!fs.existsSync(startPath)) {
    return;
  }

  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i += 1) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      const file = find(filename, filter, callback);
      if (!_.isEmpty(file)) {
        // eslint-disable-next-line consistent-return
        return file;
      }
    } else if (filter.test(filename)) {
      // eslint-disable-next-line consistent-return
      return filename;
    }
  }
}

function getKsLocation(ksVersionNumber, ksLocation) {
  if (!ksVersionNumber && !ksLocation) {
    throw new Error("Please specify 'ksVersionNumber' or 'ksLocation'");
  }

  if (ksLocation) {
    return Promise.resolve({
      ksLocationParentDir: ksLocation,
    });
  }

  return http.request(releasesList, '', {}, 'GET').then(({ body }) => {
    const osVersion = os.getVersion();
    const ksVersion = body.find(
      (item) => item.version === ksVersionNumber && item.os === osVersion,
    );

    const userhome = os.getUserHome();
    const ksLocationParentDir = path.join(userhome, '.katalon', ksVersionNumber);
    const katalonDoneFilePath = path.join(ksLocationParentDir, '.katalon.done');

    if (fs.existsSync(katalonDoneFilePath)) {
      return { ksLocationParentDir };
    }

    defaultLogger.info(`Download Katalon Studio ${ksVersionNumber} to ${ksLocationParentDir}.`);
    const downloader = new KatalonStudioDownloader(defaultLogger, ksVersion.url);
    return downloader.download(ksLocationParentDir).then(() => {
      fs.writeFileSync(katalonDoneFilePath, '');
      return { ksLocationParentDir };
    });
  });
}

module.exports = {
  execute(
    ksVersionNumber,
    ksLocation,
    ksProjectPath,
    ksArgs,
    x11Display,
    xvfbConfiguration,
    logger = defaultLogger,
  ) {
    return getKsLocation(ksVersionNumber, ksLocation).then(({ ksLocationParentDir }) => {
      logger.info(`Katalon Folder: ${ksLocationParentDir}`);

      let ksExecutable =
        find(ksLocationParentDir, /katalonc$|katalonc\.exe$/) ||
        find(ksLocationParentDir, /katalon$|katalon\.exe$/);
      if (!ksExecutable) {
        throw new Error(`Unable to find Katalon Studio executable in ${ksLocationParentDir}`);
      }

      logger.info(`Katalon Executable File: ${ksExecutable}`);

      if (!os.getVersion().includes('Windows')) {
        fs.chmodSync(ksExecutable, '755');
      }

      if (ksExecutable.indexOf(' ') >= 0) {
        ksExecutable = `"${ksExecutable}"`;
      }

      let ksCommand = utils.updateCommand(
        ksExecutable,
        { flag: '-noSplash' },
        { flag: '-runMode', value: 'console' },
        { flag: '-projectPath', value: ksProjectPath },
      );

      ksCommand = `${ksCommand} ${ksArgs}`;

      logger.info(`Execute Katalon Studio: ${ksCommand}`);
      if (logger !== defaultLogger) {
        defaultLogger.debug(`Execute Katalon Studio command: ${ksCommand}`);
      }

      return os.runCommand(ksCommand, x11Display, xvfbConfiguration, logger);
    });
  },

  getKsLocation,
};
