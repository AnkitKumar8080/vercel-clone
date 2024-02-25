const express = require("express");
const { Queue } = require("bullmq");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { generateSlug } = require("random-word-slugs");
const Redis = require("ioredis");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();

// creating a redis subscriber
const subscriber = new Redis({
  host: process.env.REDIS_SERVER_HOST,
  port: process.env.REDIS_SERVER_PORT,
});

const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", "joined " + channel.id);
  });
});

// create a socket server for sending redis logs

app.use(express.json());

const PORT = process.env.PORT || 3000;

// redis connection configuration
const connection = {
  host: process.env.REDIS_SERVER_HOST,
  port: process.env.REDIS_SERVER_PORT,
};

// connect to redis queue
const buildQueue = new Queue("build-queue", { connection });

async function addBuildQueue(slug, gitUrl) {
  const res = await buildQueue.add("new-build", {
    buildId: slug,
    gitUrl: gitUrl,
  });
  return res.id;
}

app.get("/", (req, res) => {
  return res.status(200).json("Everything is good!");
});

app.post("/build", async (req, res) => {
  const { subdomain, gitUrl } = req.body;

  if (!gitUrl) {
    return res.status(400).json("provide a valid git url");
  }

  const slug = subdomain ? subdomain : generateSlug();

  await addBuildQueue(slug, gitUrl);
  return res.status(201).json({
    message: " deploying your app...",
    URL: `${slug}.localhost:${4003}`, // reverse proxy subdomain.reverseproxyURL:port
  });
});

function initRedisSubscribe() {
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

server.listen(PORT, console.log(" ⚙️ api server started on port " + PORT));
