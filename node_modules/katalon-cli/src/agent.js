const fs = require('fs-extra');
const ip = require('ip');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TokenManager = require('./token-manager');
const { S3FileTransport } = require('./transports');

const agentState = require('./agent-state');
const { KatalonCommandExecutor, GenericCommandExecutor } = require('./command-executor');
const config = require('./config');
const jobLogger = require('./job-logger');
const katalonRequest = require('./katalon-request');
const logger = require('./logger');
const os = require('./os');
const { KatalonTestProjectDownloader, GitDownloader } = require('./remote-downloader');
const utils = require('./utils');

const { NODE_ENV } = process.env;

const defaultConfigFile = utils.getPath('agentconfig');
const requestInterval = NODE_ENV === 'debug' ? 5 * 1000 : 60 * 1000;
const pingInterval = NODE_ENV === 'debug' ? 30 * 1000 : 60 * 1000;
const sendLogWaitInterval = 10 * 1000;
const tokenManager = new TokenManager();
tokenManager.expiryExpectancy = 3 * requestInterval;

const JOB_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

const agentVersion = utils.getVersion();

function updateJob(token, jobOptions) {
  return katalonRequest.updateJob(token, jobOptions);
}

function buildJobResponse(jobId, jobStatus) {
  const jobOptions = {
    body: {
      id: jobId,
      status: jobStatus,
    },
  };
  const time = new Date();
  if (jobStatus === JOB_STATUS.RUNNING) {
    jobOptions.body.startTime = time;
  } else if (jobStatus === JOB_STATUS.SUCCESS || jobStatus === JOB_STATUS.FAILED) {
    jobOptions.body.stopTime = time;
  }

  return jobOptions;
}

function updateJobStatus(token, jobId, jobStatus) {
  const jobOptions = buildJobResponse(jobId, jobStatus);
  return updateJob(token, jobOptions);
}

async function uploadLog(token, jobInfo, filePath) {
  logger.info('Uploading job execution log...');
  // Request upload URL
  const response = await katalonRequest.getUploadInfo(token, jobInfo.projectId);
  if (!response || !response.body) {
    return null;
  }

  const { body } = response;
  const { uploadUrl } = body;
  const uploadPath = body.path;

  if (jobInfo.uploadPath) {
    jobInfo.oldUploadPath = jobInfo.uploadPath;
  }

  jobInfo.uploadUrl = uploadUrl;
  jobInfo.uploadPath = uploadPath;

  await katalonRequest.uploadFile(uploadUrl, filePath);

  const batch = `${new Date().getTime()}-${uuidv4()}`;
  const fileName = path.basename(filePath);

  // Update job's upload file
  return katalonRequest.saveJobLog(token, jobInfo, batch, fileName);
}

async function getProfiles() {
  logger.info('Getting server profiles...');
  const response = await katalonRequest.getBuildInfo();
  if (!response || !response.body) {
    return null;
  }

  const {
    body: { profiles = {} },
  } = response;

  return profiles.active;
}

function isOnPremiseProfile(profiles) {
  if (profiles && profiles.length) {
    return profiles.includes('on-premise');
  }
  return null;
}

function notifyJob(token, jobInfo) {
  return katalonRequest
    .notifyJob(token, jobInfo)
    .catch((error) => logger.warn('Unable to send job notification:', error));
}

async function executeJob(token, jobInfo, keepFiles) {
  const { jobId } = jobInfo;

  // Update job status to running
  // Take the job even if the subsequent setup steps fail
  // Prevent the job to be queued forever
  await updateJobStatus(token, jobId, JOB_STATUS.RUNNING);

  // Create directory where temporary files are contained
  const tmpRoot = path.resolve(global.appRoot, 'tmp/');
  fs.ensureDir(tmpRoot);

  // Create temporary directory to keep extracted project
  const tmpDir = utils.createTempDir(tmpRoot);
  const tmpDirPath = tmpDir.name;
  logger.info('Download test project to temp directory:', tmpDirPath);

  // Create job logger
  const logFilePath = path.resolve(tmpDirPath, 'debug.log');

  const afterUpload = () => notifyJob(token, jobInfo);

  try {
    // Create logger for job
    const jLogger = jobLogger.getLogger(logFilePath);

    // Upload log and add new transport to stream log content to s3
    // Everytime a new log entry is written to file
    await uploadLog(token, jobInfo, logFilePath);
    jLogger.add(
      new S3FileTransport(
        {
          filePath: logFilePath,
          signedUrl: jobInfo.uploadUrl,
          logger,
          wait: sendLogWaitInterval,
        },
        afterUpload,
      ),
    );

    jLogger.info(`Triggered by Katalon Agent ${config.version}.`);
    jLogger.info(`Agent server: ${config.serverUrl}${config.isOnPremise ? ' (OnPremise)' : ''}`);
    jLogger.info(`Agent user: ${config.email}`);

    logger.info('Downloading test project...');
    const { downloader, executor } = jobInfo;
    downloader.logger = jLogger;
    await downloader.download(tmpDirPath);
    const status = await executor.execute(jLogger, tmpDirPath);

    jLogger.close();
    logger.info('Job execution finished.');
    logger.debug('JOB FINISHED WITH STATUS:', status);

    // Update job status after execution
    const jobStatus = status === 0 ? JOB_STATUS.SUCCESS : JOB_STATUS.FAILED;

    logger.debug(`Update job with status '${jobStatus}.'`);
    await updateJobStatus(token, jobId, jobStatus);
    logger.info('Job execution has been completed.');
  } catch (err) {
    logger.error(`${executeJob.name}:`, err);

    // Update job status to failed when exception occured
    // NOTE: Job status is set FAILED might not be because of a failed execution
    // but because of other reasons such as cannot remove tmp directory or cannot upload log
    const jobStatus = JOB_STATUS.FAILED;
    logger.debug(`Error caught during job execution! Update job with status '${jobStatus}'`);
    await updateJobStatus(token, jobId, jobStatus);
  } finally {
    agentState.decrementExecutingJobs();

    await uploadLog(token, jobInfo, logFilePath);
    logger.info('Job execution log uploaded.');
    notifyJob(token, jobInfo);

    // Remove temporary directory when `keepFiles` is false
    if (!keepFiles) {
      tmpDir.removeCallback();
    }
  }
}

function validateField(configs, propertyName, configFile = defaultConfigFile) {
  if (!configs[propertyName]) {
    logger.error(`Please specify '${propertyName}' property in ${path.basename(configFile)}.`);
    return false;
  }
  return true;
}

function setLogLevel(logLevel) {
  if (logLevel) {
    logger.level = logLevel;
  }
}

function createDownloader(token, parameter) {
  if (parameter.type === 'GIT') {
    return new GitDownloader(logger, parameter.gitRepositoryResource);
  }

  return new KatalonTestProjectDownloader(logger, parameter.downloadUrl, token);
}

function createCommandExecutor(
  token,
  projectId,
  teamId,
  ksArgs,
  x11Display,
  xvfbConfiguration,
  parameter,
) {
  if (parameter.configType === 'GENERIC_COMMAND') {
    const info = {
      commands: parameter.command,
      projectId,
      sessionId: parameter.sessionId,
    };
    return new GenericCommandExecutor(token, info);
  }

  const info = {
    teamId,
    projectId,
    ksVersionNumber: parameter.ksVersion,
    ksLocation: parameter.ksLocation,
    ksArgs,
    x11Display,
    xvfbConfiguration,
  };
  return new KatalonCommandExecutor(token, info);
}

const agent = {
  start(commandLineConfigs = {}) {
    logger.info(`Katalon Agent ${config.version} started @ ${new Date()}`);
    const hostAddress = ip.address();
    const hostName = os.getHostName();
    const osVersion = os.getVersion();

    const configFile = commandLineConfigs.configPath || defaultConfigFile;
    logger.info('Loading configs @', configFile);
    config.update(commandLineConfigs, configFile);
    const { email, teamId, apikey } = config;
    setLogLevel(config.logLevel);

    validateField(config, 'email', configFile);
    validateField(config, 'apikey', configFile);
    validateField(config, 'serverUrl', configFile);
    validateField(config, 'teamId', configFile);

    tokenManager.email = email;
    tokenManager.password = apikey;

    let token;
    const requestAndExecuteJob = async () => {
      agentState.incrementExecutingJobs();
      try {
        const maxJobs = agentState.threshold + 1;
        if (agentState.numExecutingJobs >= maxJobs) {
          agentState.decrementExecutingJobs();
          return;
        }

        if (config.isOnPremise === undefined || config.isOnPremise === null) {
          const profiles = await getProfiles();
          config.isOnPremise = isOnPremiseProfile(profiles);
        }
        if (config.isOnPremise === undefined || config.isOnPremise === null) {
          agentState.decrementExecutingJobs();
          return;
        }

        token = await tokenManager.ensureToken();
        if (!token) {
          agentState.decrementExecutingJobs();
          return;
        }

        const configs = config.read(configFile);
        if (!configs.uuid) {
          configs.uuid = this.generateUuid();
          config.write(configFile, configs);
        }

        const { uuid, keepFiles, logLevel, x11Display, xvfbRun } = configs;

        setLogLevel(logLevel);

        // Agent is not executing job, request new job
        const requestJobResponse = await katalonRequest.requestJob(token, uuid, teamId);
        if (
          !requestJobResponse ||
          !requestJobResponse.body ||
          !requestJobResponse.body.parameter ||
          !requestJobResponse.body.testProject
        ) {
          // There is no job to execute
          agentState.decrementExecutingJobs();
          return;
        }
        const jobBody = requestJobResponse.body;
        const {
          id: jobId,
          parameter,
          testProject: { projectId },
        } = jobBody;

        let ksArgs;
        if (config.isOnPremise) {
          ksArgs = utils.updateCommand(
            parameter.command,
            { flag: '-apiKeyOnPremise', value: apikey },
          );
        } else {
          ksArgs = utils.updateCommand(
            parameter.command,
            { flag: '-apiKey', value: apikey },
            { flag: '-serverUrl', value: config.serverUrl },
          );
        }

        const downloader = createDownloader(token, parameter);
        const executor = createCommandExecutor(
          token,
          projectId,
          teamId,
          ksArgs,
          x11Display,
          xvfbRun,
          parameter,
        );

        const jobInfo = {
          downloader,
          executor,
          jobId,
          projectId,
          teamId,
        };

        await executeJob(token, jobInfo, keepFiles);
      } catch (err) {
        agentState.decrementExecutingJobs();
        logger.error(err);
      }
    };

    const syncInfo = () => {
      if (!token) {
        return;
      }

      const configs = config.read(configFile);
      if (!configs.uuid) {
        return;
      }

      if (!configs.agentName) {
        configs.agentName = hostName;
      }

      const { uuid, agentName } = configs;

      const requestBody = {
        uuid,
        name: agentName,
        teamId,
        hostname: hostName,
        ip: hostAddress,
        os: osVersion,
        numExecutingJobs: agentState.numExecutingJobs,
        agentVersion,
      };
      const options = {
        body: requestBody,
      };
      logger.trace(requestBody);

      katalonRequest
        .pingAgent(token, options)
        .then((response) => {
          if (response && response.body && response.body.threshold) {
            agentState.threshold = response.body.threshold;
          }
        })
        .catch((err) => logger.error('Cannot send agent info to server:', err)); // async
    };

    requestAndExecuteJob();
    setInterval(requestAndExecuteJob, requestInterval);
    setInterval(syncInfo, pingInterval);
  },

  async startCI(commandLineConfigs = {}) {
    logger.info(`Agent (CI mode) ${config.version} started @ ${new Date()}`);

    const configFile = commandLineConfigs.configPath || defaultConfigFile;
    logger.info('Loading agent configs @', configFile);
    config.update(commandLineConfigs, configFile);
    const { email, teamId, apikey } = config;
    setLogLevel(config.logLevel);

    tokenManager.email = email;
    tokenManager.password = apikey;

    try {
      if (config.isOnPremise === undefined || config.isOnPremise === null) {
        const profiles = await getProfiles();
        config.isOnPremise = isOnPremiseProfile(profiles);
      }
      if (config.isOnPremise === undefined || config.isOnPremise === null) {
        return;
      }

      const token = await tokenManager.ensureToken();

      const configs = config.read(configFile);

      const { keepFiles, logLevel, x11Display, xvfbRun } = configs;

      setLogLevel(logLevel);

      // Read job configuration from file
      const jobBody = fs.readJsonSync('job.json', { encoding: 'utf-8' });
      const {
        id: jobId,
        parameter,
        testProject: { projectId },
      } = jobBody;

      let ksArgs;
      if (config.isOnPremise) {
        ksArgs = utils.updateCommand(parameter.command, {
          flag: '-apiKeyOnPremise',
          value: apikey,
        });
      } else {
        ksArgs = utils.updateCommand(
          parameter.command,
          { flag: '-apiKey', value: apikey },
          { flag: '-serverUrl', value: config.serverUrl },
        );
      }

      const downloader = createDownloader(token, parameter);
      const executor = createCommandExecutor(
        token,
        projectId,
        teamId,
        ksArgs,
        x11Display,
        xvfbRun,
        parameter,
      );

      const jobInfo = {
        downloader,
        executor,
        jobId,
        projectId,
        teamId,
      };

      await executeJob(token, jobInfo, keepFiles);
    } catch (err) {
      logger.error(err);
    }
  },

  stop() {
    logger.info(`Katalon Agent ${config.version} stopped @ ${new Date()}`);
  },

  generateUuid() {
    return `${new Date().getTime()}-${uuidv4()}`;
  },

  updateConfigs(options) {
    const { version, configPath: configFile = defaultConfigFile, ...opts } = options;
    config.update(opts, configFile);
    if (!config.uuid) {
      config.uuid = this.generateUuid();
    }
    config.write(configFile, config);
    logger.info(`Updated configs @ ${configFile}.`);
  },
};

module.exports = agent;
