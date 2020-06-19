const moment = require('moment');
const path = require('path');
const tmp = require('tmp');
const packageJson = require('../package.json');

module.exports = {
  getPath(relativePath) {
    if (!global.appRoot) {
      global.appRoot = path.resolve('.');
    }
    return path.join(global.appRoot, relativePath);
  },

  createTempDir(tmpRoot, options) {
    const tmpPrefix = moment(new Date()).format('YYYY.MM.DD-H.m-');
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
      keep: true,
      tmpdir: tmpRoot,
      prefix: tmpPrefix,
      ...options,
    });
    return tmpDir;
  },

  stringify(object) {
    return object && Object.keys(object).length > 0 ? JSON.stringify(object, null, 2) : '';
  },

  updateCommand(command, ...options) {
    return options.reduce((cmd, option) => {
      const { flag, value } = option;
      if (cmd.includes(flag)) {
        return cmd;
      }
      if (value) {
        return `${cmd} ${flag}="${value}"`;
      }
      return `${cmd} ${flag}`;
    }, command);
  },

  getVersion() {
    return packageJson.version;
  },
};
