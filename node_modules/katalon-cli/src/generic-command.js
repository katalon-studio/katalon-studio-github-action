const fs = require('fs-extra');
const path = require('path');

const logger = require('./logger');
const os = require('./os');

function executeCommands(commands, tmpDirPath, outputDir, jLogger) {
  const osVersion = os.getVersion();
  let scriptExtension;

  if (osVersion.includes('Windows')) {
    scriptExtension = '.bat';
  } else {
    scriptExtension = '.sh';
  }
  const scriptPath = path.resolve(tmpDirPath, `script${scriptExtension}`);
  fs.writeFileSync(scriptPath, commands);
  fs.chmodSync(scriptPath, '755');

  process.env.KATALON_WORKING_DIR = tmpDirPath;
  process.env.KATALON_OUTPUT_DIR = outputDir;

  logger.info('Executing commands inside', scriptPath);
  logger.debug('Executing following command(s)\n', commands);
  return os.runCommand(scriptPath, null, null, jLogger, tmpDirPath);
}

module.exports = {
  executeCommands,
};
