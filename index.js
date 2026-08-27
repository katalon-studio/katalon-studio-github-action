const { execute } = require("katalon-agent/src/service/katalon-studio");
const core = require("@actions/core");

const kreVersion = core.getInput("version");
const projectPath = core.getInput("projectPath");
const kreArgs = core.getInput("args");

try {
  execute(kreVersion, "", projectPath, kreArgs, "", "", {
    info: function (message) {
      console.log(message);
    },
    debug: function (message) {
      console.log(message);
    },
    error: function (message) {
      console.error(message);
    },
  })
    .then((status) => {
      if (status !== 0) {
        core.setFailed(`Exit code ${status}.`);
      }
    })
    .catch((err) => {
      console.error(err);
      core.setFailed(err);
    });
} catch (error) {
  console.error(error);
  core.setFailed(error.message);
}
