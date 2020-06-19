const {
  npm_package_version: version,
  JOB_BASE_NAME: jobName = "",
  BUILD_DISPLAY_NAME: buildName = ""
} = process.env;

const buildInfo = jobName ? ` Build ${jobName}${buildName}` : "";

module.exports = {
  git: {
    pushRepo: "https://github.com/katalon-studio/katalon-agent.git",
    changelog:
      'git log -1 --pretty=format:"%s%n%n>**Commit:** %h%d%n>**Author:** %an%n>**Date:** %ai%n"',
    tagName: `v${version}`,
    requireCleanWorkingDir: false,
    tag: false,
    commit: false,
    push: false,
    requireUpstream: false
  },
  github: {
    release: true,
    releaseName: `Release ${version} 🚧${buildInfo}`,
    draft: true,
    assets: [
      "packages/*.zip",
      "packages/*.tar.gz",
    ],
    isUpdate: false,
  },
  npm: false,
  increment: false
};
