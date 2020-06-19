const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const config = require('./config');
const genericCommand = require('./generic-command');
const ks = require('./katalon-studio');
const properties = require('./properties');
const reportUploader = require('./report-uploader');

const PROJECT_FILE_PATTERN = '**/*.prj';
const TESTOPS_PROPERTIES_FILE = 'com.kms.katalon.integration.analytics.properties';
const GENERIC_COMMAND_OUTPUT_DIR = 'katalon-agent-output';
const JUNIT_FILE_PATTERN = '**/*.xml';

function buildTestOpsIntegrationProperties(token, teamId, projectId) {
  const deprecatedProperties = {
    'analytics.server.endpoint': config.serverUrl,
    'analytics.authentication.email': config.email,
    'analytics.authentication.password': config.apikey,
    'analytics.authentication.encryptionEnabled': false,
    'analytics.testresult.autosubmit': true,
    'analytics.testresult.attach.screenshot': true,
    'analytics.testresult.attach.log': true,
    'analytics.testresult.attach.capturedvideos': false,
  };
  const onPremiseProperties = {
    'analytics.onpremise.enable': config.isOnPremise,
    'analytics.onpremise.server': config.serverUrl,
  };
  return {
    ...deprecatedProperties,
    'analytics.integration.enable': true,
    'analytics.authentication.token': token,
    'analytics.team': JSON.stringify({ id: teamId.toString() }),
    'analytics.project': JSON.stringify({ id: projectId.toString() }),
    ...onPremiseProperties,
  };
}

function testCopyJUnitReports(outputDir) {
  const sampleDir = 'C:/Projects/katalon-analytics/misc/sample-junit-reports';
  const files = ['casperjs.xml', 'sample-junit.xml', 'sample-junit-out.xml'];
  files.forEach((file) => fs.copyFileSync(path.join(sampleDir, file), path.join(outputDir, file)));
}

class BaseKatalonCommandExecutor {
  constructor(info) {
    this.ksVersionNumber = info.ksVersionNumber;
    this.ksLocation = info.ksLocation;
    this.ksArgs = info.ksArgs;
    this.x11Display = info.x11Display;
    this.xvfbConfiguration = info.xvfbConfiguration;
  }

  async execute(logger, execDirPath) {
    // Find project file inside project directory
    const projectPathPattern = path.resolve(execDirPath, PROJECT_FILE_PATTERN);
    const ksProjectPaths = glob.sync(projectPathPattern, { nodir: true });

    if (ksProjectPaths.length <= 0) {
      logger.error('Unable to find a Katalon project.');
      return Promise.resolve(1);
    }

    if (ksProjectPaths.length > 1) {
      logger.error(`Multiple Katalon projects are found: ${ksProjectPaths}.`);
      return Promise.resolve(1);
    }

    const [ksProjectPath] = ksProjectPaths;

    if (this.preExecuteHook && typeof this.preExecuteHook === 'function') {
      this.preExecuteHook(logger, ksProjectPath);
    }

    return ks.execute(
      this.ksVersionNumber,
      this.ksLocation,
      ksProjectPath,
      this.ksArgs,
      this.x11Display,
      this.xvfbConfiguration,
      logger,
    );
  }
}

class KatalonCommandExecutor extends BaseKatalonCommandExecutor {
  constructor(token, info) {
    super(info);
    this.token = token;
    this.teamId = info.teamId;
    this.projectId = info.projectId;
  }

  preExecuteHook(logger, ksProjectPath) {
    // Manually configure integration settings for KS to upload execution report
    logger.debug('Configure Katalon TestOps integration.');
    const ksProjectDir = path.dirname(ksProjectPath);
    const testOpsPropertiesPath = path.resolve(
      ksProjectDir,
      'settings',
      'internal',
      TESTOPS_PROPERTIES_FILE,
    );
    properties.writeProperties(
      testOpsPropertiesPath,
      buildTestOpsIntegrationProperties(this.token, this.teamId, this.projectId),
    );
  }
}

class GenericCommandExecutor {
  constructor(token, info) {
    this.token = token;
    this.commands = info.commands;
    this.projectId = info.projectId;
    this.sessionId = info.sessionId;
  }

  async execute(logger, execDirPath) {
    const outputDir = path.join(execDirPath, GENERIC_COMMAND_OUTPUT_DIR);
    fs.ensureDir(outputDir);

    const status = await genericCommand.executeCommands(
      this.commands,
      execDirPath,
      outputDir,
      logger,
    );
    // testCopyJUnitReports(outputDir);

    const opts = {
      sessionId: this.sessionId,
    };

    logger.info('Uploading JUnit reports...');
    // Collect all junit xml files and upload to TestOps
    await reportUploader.uploadReports(
      this.token,
      this.projectId,
      outputDir,
      'junit',
      JUNIT_FILE_PATTERN,
      opts,
    );
    logger.info('All JUnit reports successfully uploaded.');
    return status;
  }
}

module.exports.KatalonCommandExecutor = KatalonCommandExecutor;
module.exports.GenericCommandExecutor = GenericCommandExecutor;
