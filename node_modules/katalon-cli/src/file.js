const decompress = require('decompress');
const path = require('path');
const simpleGit = require('simple-git/promise')();
const tmp = require('tmp');

const config = require('./config');
const http = require('./http');
const defaultLogger = require('./logger');

module.exports = {
  extract(filePath, targetDir, haveFilter, logger = defaultLogger) {
    logger.info(`Decompressing the ${filePath} into ${targetDir}.`);
    return decompress(filePath, targetDir, {
      filter: (decompressFile) => {
        if (haveFilter) {
          const decompressPath = decompressFile.path;
          return !decompressPath.includes('.git/') && !decompressPath.includes('__MACOSX');
        }
        return true;
      },
    });
  },

  downloadAndExtract(url, targetDir, haveFilter = false, token = null, logger = defaultLogger) {
    logger.info(`Downloading from ${url}. It may take a few minutes.`);
    const file = tmp.fileSync();
    const filePath = file.name;
    logger.debug(`Download into temporary directory: ${filePath}`);
    const options = config.isOnPremise && token ? { auth: { bearer: token } } : {};
    return http
      .stream(url, filePath, options)
      .then(() => this.extract(filePath, targetDir, haveFilter, logger));
  },

  clone(gitRepository, targetDir, cloneOpts = {}, logger = defaultLogger) {
    const {
      repository,
      branch,
      username,
      password,
    } = gitRepository || {};

    const repoURL = new URL(repository);
    repoURL.username = username;
    repoURL.password = password;
    const url = repoURL.href;

    const dirName = url.split('/').pop();
    const gitTargetDir = path.join(targetDir, dirName);
    logger.info(`Cloning from ${repository} (${branch}) into ${gitTargetDir}. It may take a few minutes.`);

    const overrideOpts = Object.entries(cloneOpts).reduce((opts, [k, v]) => {
      opts.push(k);
      if (v) {
        opts.push(v);
      }
      return opts;
    }, []);

    return simpleGit.clone(url, gitTargetDir, [
      '--depth',
      '1',
      '--branch',
      branch.split('/').pop(),
      ...overrideOpts,
    ]);
  },
};
