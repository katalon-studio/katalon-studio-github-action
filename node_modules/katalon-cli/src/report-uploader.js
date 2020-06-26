const archiver = require('archiver');
const find = require('find');
const fse = require('fs-extra');
const glob = require('glob');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

const katalonRequest = require('./katalon-request');

const logExtension = /^[^.]+$|\.(?!(zip|har)$)([^.]+$)/;
const harExtension = /.*\.(har)$/;

// const uploadInfoOutPath=ka_upload_info.json

// const oauth2 = {
//   grant_type: "password",
//   client_secret: "kit_uploader",
//   client_id: "kit_uploader"
// }
const zip = (folderPath, harFiles) => {
  const tempPath = path.join(folderPath, 'katalon-analytics-tmp');
  fse.ensureDirSync(tempPath);
  // create a file to stream archive data to.
  const zipPath = path.join(tempPath, `hars-${new Date().getTime()}.zip`);

  const output = fse.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Sets the compression level.
  });

  archive.pipe(output);

  harFiles.forEach((file) => {
    const fileName = path.basename(file);
    // const rel = path.relative(folderPath, file);
    archive.file(file, { name: fileName });
  });

  archive.finalize();
  return zipPath;
};

const writeUploadInfo = (batch, files) => {
  const uploadInfo = {};
  uploadInfo[batch] = files;
  if (uploadInfoOutPath) {
    fse.outputJSONSync(file, uploadInfo);
  }
};

function uploadFile(token, projectId, batch, folderName, filePath, isEnd, reportType, opts = {}) {
  return katalonRequest.getUploadInfo(token, projectId).then(({ body }) => {
    const { uploadUrl } = body;
    const uploadPath = body.path;

    return katalonRequest.uploadFile(uploadUrl, filePath).then(() => {
      const fileName = path.basename(filePath);
      return katalonRequest.uploadFileInfo(
        token,
        projectId,
        batch,
        folderName,
        fileName,
        uploadPath,
        isEnd,
        reportType,
        opts,
      );
    });
  });
}

module.exports = {
  uploadReports(token, projectId, folderPath, reportType, reportPattern, opts = {}) {
    const pathPattern = path.resolve(folderPath, reportPattern);
    const reports = glob.sync(pathPattern, { nodir: true });
    const dirNames = reports.map((report) => path.dirname(path.relative(folderPath, report)));

    const [first, ...rest] = reports;
    const [firstDirName, ...restDirNames] = dirNames;
    if (!first) {
      return Promise.resolve();
    }

    const batch = `${new Date().getTime()}-${uuidv4()}`;

    const uploadPromises = rest.map((report, idx) =>
      uploadFile(token, projectId, batch, restDirNames[idx], report, false, reportType, opts),
    );

    return Promise.all(uploadPromises).then(() =>
      uploadFile(token, projectId, batch, firstDirName, first, true, reportType, opts),
    );
  },

  upload(folderPath) {
    const { email, password, projectId } = config;
    const harFiles = find.fileSync(harExtension, folderPath);
    const logFiles = find.fileSync(logExtension, folderPath);

    const harZips = {};
    harFiles.forEach((filePath) => {
      const parent = path.resolve(filePath, '../../..');
      const files = harZips[parent];
      if (!files) {
        harZips[parent] = [];
      }
      harZips[parent].push(filePath);
    });

    Object.keys(harZips).map((folderPath) => {
      const files = harZips[folderPath];
      const zipPath = zip(folderPath, files);
      logFiles.push(zipPath);
    });

    const batch = `${new Date().getTime()}-${uuidv4()}`;

    const uploadPromises = [];

    katalonRequest.requestToken(email, password).then((response) => {
      const token = response.body.access_token;

      for (let i = 0; i < logFiles.length - 1; i += 1) {
        const filePath = logFiles[i];
        const promise = katalonRequest.getUploadInfo(token, projectId).then(({ body }) => {
          const { uploadUrl } = body;
          const uploadPath = body.path;
          const fileName = path.basename(filePath);
          const folderPath = path.dirname(filePath);
          let parent;
          if (path.extname(fileName) === '.zip') {
            parent = path.resolve(filePath, '../../../..');
          } else {
            parent = path.resolve(filePath, '../../..');
          }
          const rel = path.relative(parent, folderPath);
          return katalonRequest
            .uploadFile(uploadUrl, filePath)
            .then(() =>
              katalonRequest.uploadFileInfo(
                token,
                projectId,
                batch,
                rel,
                fileName,
                uploadPath,
                false,
              ),
            );
        });
        uploadPromises.push(promise);
      }

      Promise.all(uploadPromises).then(() => {
        const filePath = logFiles[logFiles.length - 1];
        katalonRequest.requestToken(email, password).then((response) => {
          const token = response.body.access_token;
          return katalonRequest.getUploadInfo(token, projectId).then(({ body }) => {
            const { uploadUrl } = body;
            const uploadPath = body.path;
            const fileName = path.basename(filePath);
            const folderPath = path.dirname(filePath);
            let parent;
            if (path.extname(fileName) === '.zip') {
              parent = path.resolve(filePath, '../../../..');
            } else {
              parent = path.resolve(filePath, '../../..');
            }
            const rel = path.relative(parent, folderPath);
            return katalonRequest
              .uploadFile(uploadUrl, filePath)
              .then(() =>
                katalonRequest.uploadFileInfo(
                  token,
                  projectId,
                  batch,
                  rel,
                  fileName,
                  uploadPath,
                  true,
                ),
              );
          });
        });
      });

      writeUploadInfo(batch, logFiles);
    });
  },
};
