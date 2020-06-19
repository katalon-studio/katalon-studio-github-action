// add an empty argument to the front in case the package is compiled to native code
if (process.isPackaged) {
  process.argv.unshift('');
}

const program = require('commander');
const path = require('path');
const readline = require('readline');

if (process.argv.includes('--service')) {
  global.appRoot = path.resolve(path.dirname(process.execPath));
  process.argv = process.argv.filter((arg) => arg !== '--service');
} else {
  global.appRoot = path.resolve('.');
}

const agent = require('./src/agent');
const bdd = require('./src/bdd');
const config = require('./src/config');
const packageJson = require('./package.json');
const reportUploader = require('./src/report-uploader');

const version = `Version: ${packageJson.version}`;
config.version = packageJson.version;

// program options and arguments
program
  .description(packageJson.description)
  .command('get-feature <JQL>')
  .version(version)
  .option('-j, --jira-url <value>', 'JIRA URL')
  .option('-u, --username <value>', 'Username')
  .option('-p, --password <value>', 'Password')
  .option('-o, --output <value>', 'Output Directory')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .on('--help', () => {})
  .action((JQL, command) => {
    const options = {
      outputDir: command.output,
      jiraUrl: command.jiraUrl,
      username: command.username,
      password: command.password,
      proxy: command.proxy,
      jql: JQL,
    };

    config.update(options);
    bdd.getFeatures();
  });

program
  .command('upload-report <path>')
  .version(version)
  .option('-s, --server-url <value>', 'Katalon Analytics URL', 'https://analytics.katalon.com')
  .option('-u, --username <value>', 'Email')
  .option('-p, --password <value>', 'Password')
  .option('-k, --katalon-project <value>', 'Katalon Project Id')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .on('--help', () => {})
  .action((uploadPath, command) => {
    const options = {
      serverUrl: command.serverUrl,
      email: command.username,
      password: command.password,
      proxy: command.proxy,
      projectId: command.katalonProject,
    };

    config.update(options);
    reportUploader.upload(uploadPath);
  });

program
  .command('config')
  .option('-s, --server-url <value>', 'Katalon Analytics URL')
  .option('-u, --username <value>', 'Email')
  .option('-p, --apikey <value>', 'API key')
  .option('-t, --teamid <value>', 'Team ID')
  .option('-a, --agent-name <value>', 'Agent name')
  .option('-c, --config <value>', 'Configuration file path')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .option('--log-level <value>', 'Log level (ALL < TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK < OFF)')
  .option('--xvfb-run <value>', 'xvfb-run options')
  .option('--x11-display <value>', 'x11 DISPLAY environment variable')
  .option('--keep-files', 'Keep test project temporary files')
  .option('--no-keep-files', 'Remove test project temporary files (default behavior)')
  .action((command) => {
    const options = {
      serverUrl: command.serverUrl,
      email: command.username,
      apikey: command.apikey,
      teamId: command.teamid,
      agentName: command.agentName,
      configPath: command.config,
      proxy: command.proxy,
      logLevel: command.logLevel,
      xvfbRun: command.xvfbRun,
      x11Display: command.x11Display,
      keepFiles: command.keepFiles,
    };
    agent.updateConfigs(options);
  });

program
  .command('start-agent')
  .version(version)
  .option('-s, --server-url <value>', 'Katalon Analytics URL')
  .option('-u, --username <value>', 'Email')
  .option('-p, --apikey <value>', 'API key')
  .option('-t, --teamid <value>', 'Team ID')
  .option('-a, --agent-name <value>', 'Agent name')
  .option('-c, --config <value>', 'Configuration file path')
  .option('-x, --proxy <value>', 'HTTTP/HTTPS Proxy')
  .option('--ci', 'CI mode')
  .action((command) => {
    const options = {
      serverUrl: command.serverUrl,
      email: command.username,
      apikey: command.apikey,
      teamId: command.teamid,
      agentName: command.agentName,
      configPath: command.config,
      proxy: command.proxy,
    };
    if (process.platform === 'win32') {
      readline
        .createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        .on('SIGINT', () => {
          process.emit('SIGINT');
        });
    }

    process.on('SIGINT', () => {
      agent.stop();
      // graceful shutdown
      process.exit();
    });

    if (command.ci) {
      agent.startCI(options).then(() => process.emit('SIGINT'));
    } else {
      agent.start(options);
    }
  });

program.version(version);

program.parse(process.argv);
