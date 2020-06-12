const fse = require('fs-extra');
const properties = require('properties');
const logger = require('./logger');

function writeProperties(propertiesFile, prop) {
  fse.ensureFileSync(propertiesFile);
  properties.stringify(prop, { path: propertiesFile }, (err, str) => {
    if (err) {
      return logger.error(err);
    }

    return logger.trace('Write properties:\n', str);
  });
}

module.exports.writeProperties = writeProperties;
