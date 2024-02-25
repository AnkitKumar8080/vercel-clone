const { Worker, Queue } = require("bullmq");
const { init } = require("./script");
const { getGitRepo } = require("./services/fetchGitRepo");
const fs = require("fs");
const Redis = require("ioredis");
const dotenv = require("dotenv");

dotenv.config();

const publisher = new Redis({
  host: process.env.REDIS_SERVER_HOST,
  port: process.env.REDIS_SERVER_PORT,
});
// create a publisher for redis
const publishLog = (buildId, log) => {
  publisher.publish(`logs:${buildId}`, JSON.stringify(log));
};

const connection = {
  host: process.env.REDIS_SERVER_HOST,
  port: process.env.REDIS_SERVER_PORT,
};

const buildQueue = new Queue("build-queue", { connection });

console.log(" 🛠️  started build server...\n");
console.log(" waiting for new jobs...\n");

const worker = new Worker(
  "build-queue",
  async (job) => {
    console.log("Processing queue job...");
    console.log({
      buildId: job.data.buildId,
      gitUrl: job.data.gitUrl,
    });

    publishLog(job.data.buildId, "fetching git repository...");
    await getGitRepo(job.data.gitUrl);
    publishLog(job.data.buildId, "fetch complete...");

    await init(job.data.buildId);
  },
  { connection }
);

worker.on("complete", (job) => {
  console.log(`Completed build : ${job.data.buildId}\n `);
  buildQueue.pause();
});

worker.on("error", (error) => {
  `Error building build : ${error.message}`;
});
