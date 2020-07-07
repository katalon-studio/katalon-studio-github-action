const { execute } = require("katalon-cli/src/katalon-studio");
const core = require("@actions/core");

const user_version = core.getInput("version");
const user_projectPath = core.getInput("projectPath");
const user_args = core.getInput("args");

try {
  execute(user_version, "", user_projectPath, user_args, "", "", {
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
