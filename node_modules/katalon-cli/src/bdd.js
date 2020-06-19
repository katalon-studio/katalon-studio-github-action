const fse = require('fs-extra');
const path = require('path');
const config = require('./config');
const http = require('./http');

function writeGherkin(issue, fieldIds) {
  const { outputDir } = config;
  const { key, fields } = issue;
  const name = fields.summary;
  fieldIds.forEach((fieldId, index) => {
    const content = fields[fieldId];
    if (content) {
      let number = '';
      if (index > 0) {
        number = `_${index}`;
      }
      const file = path.resolve(outputDir, `${key}_${name}${number}.feature`);
      fse.outputFile(file, content);
    }
  });
}

module.exports = {
  getFeatures() {
    const { jiraUrl } = config;
    http
      .request(
        jiraUrl,
        '/rest/api/2/field',
        {
          auth: {
            username: config.username,
            password: config.password,
          },
        },
        'get',
      )
      .then((response) => {
        const fields = response.body;
        const gherkinFields = fields
          .filter((field) => {
            const condition =
              field.custom &&
              field.schema &&
              field.schema.type === 'string' &&
              field.schema.custom ===
                'com.atlassian.jira.plugin.system.customfieldtypes:textarea' &&
              field.name === 'Katalon BDD';
            return condition;
          })
          .map((field) => field.id);

        const body = {
          jql: config.jql,
          fields: [...gherkinFields, 'summary'],
          maxResults: 10000,
          startAt: 0,
        };
        return http
          .request(
            jiraUrl,
            '/rest/api/2/search',
            {
              body,
              auth: {
                username: config.username,
                password: config.password,
              },
            },
            'post',
          )
          .then((response) => {
            const result = response.body;
            const { issues } = result;
            issues.forEach((issue) => {
              writeGherkin(issue, gherkinFields);
            });
          });
      });
  },
};
