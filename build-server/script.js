const { exec, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Redis = require("ioredis");
const dotenv = require("dotenv");

dotenv.config();

const publisher = new Redis({
  host: "192.168.0.109",
  port: 6379,
});
// create a publisher for redis
const publishLog = (buildId, log) => {
  publisher.publish(`logs:${buildId}`, JSON.stringify(log));
};

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
    secretAccessKey: process.env.S3_BUCKET_SECRET_KEY,
  },
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
});

const init = (buildId) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Executing script.js...\n");
      publishLog(buildId, "starting build...");

      // create a relative path of the output dir
      const outputDirPath = path.join(__dirname, "output");

      // building the project directory
      const proc = exec(`cd ${outputDirPath} && npm install && npm run build`);

      // capturing logs when executing above commands

      publishLog(buildId, "running npm install and npm run build");
      proc.stdout.on("data", (data) => console.log(data + "\n"));

      proc.stdout.on("error", (err) => console.log(err + "\n"));

      proc.stdout.on("close", async () => {
        console.log("Build Finished! \n");
        publishLog(buildId, "build finished");

        // const buildFolderPath = path.join(__dirname, "output", "dist"); // relative path for the dist folder

        const folderPath = () => {
          const buildPath = path.join(__dirname, "output", "build");
          const distPath = path.join(__dirname, "output", "dist");

          if (fs.existsSync(buildPath)) {
            return buildPath;
          }
          if (fs.existsSync(distPath)) {
            return distPath;
          }

          // Throw an error if neither build nor dist directories exist
          publishLog(buildId, "no build or dist directories found in output");
          throw new Error(
            "Neither 'build' nor 'dist' directories found in 'output' folder."
          );
        };
        // const distFolderPath = buildFolderPath;

        const distFolderPath = folderPath();

        // create an array of folders present in the output dir
        const distFolderContents = fs.readdirSync(distFolderPath, {
          recursive: true,
        });

        console.log("Starting to upload to s3... \n");
        publishLog(buildId, "starting to upload to s3...");

        // iterate over all files and folder in the distfoldercontents directory
        for (const file of distFolderContents) {
          const filePath = path.join(distFolderPath, file);
          if (fs.lstatSync(filePath).isDirectory()) continue; // ignore directories

          console.log("uploading ", filePath + "\n");

          // command to upload to s3
          const command = new PutObjectCommand({
            Bucket: "mybucket",
            Key: `__outputs/${buildId}/${file}`,
            Body: fs.createReadStream(filePath),
            ContentType: mime.lookup(filePath),
          });

          // upload to s3
          await s3Client.send(command);
        }

        console.log("Done uploading to s3... \n");
        publishLog(buildId, "Done uploading to s3...");
        publishLog(buildId, "you can now access your react app");

        console.log("removing  output directory... \n");

        // Remove the output directory and all its contents

        fs.rmSync(path.join(__dirname, "output"), { recursive: true });
        console.log("Directory removed... \n");
        console.log("waiting for new build... \n");
        resolve(); // Resolve the promise
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { init };
