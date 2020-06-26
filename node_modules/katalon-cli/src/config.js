const _ = require('lodash');
const fse = require('fs-extra');
const ini = require('ini');
const path = require('path');

const configFile = path.resolve(process.cwd(), 'config.ini');
let global = {};

// NOTE: ONLY EXPORT FUNCTIONS, DO NOT EXPORT FIELDS
module.exports = {
  update(commandLineConfigs, filepath = configFile) {
    /* Update the module with configs read from both config file and command line */
    // Filter undefined fields
    commandLineConfigs = _.pickBy(commandLineConfigs, (value) => value !== undefined);
    // Read configs from file
    const fileConfigs = this.read(filepath);
    // Merge both configs
    const configs = {
      ...fileConfigs,
      ...commandLineConfigs,
      pathPatterns: _.get(fileConfigs, 'paths.path', []),
    };

    // Add configs to global and export configs
    global = _.extend(global, configs);
    Object.keys(global).forEach((p) => {
      module.exports[p] = global[p];
    });
  },

  read(filepath) {
    fse.ensureFileSync(filepath);
    const fp = fse.readFileSync(filepath, 'utf-8');
    return ini.parse(fp);
  },

  write(filepath, configs) {
    // Filter undefined and function fields
    configs = _.pickBy(configs, (value) => !_.isUndefined(value) && !_.isFunction(value));
    const outputINI = ini.stringify(configs);
    fse.outputFileSync(filepath, outputINI);
  },

  getConfigFile: () => configFile,
};
