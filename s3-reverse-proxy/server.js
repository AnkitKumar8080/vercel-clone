const express = require("express");
const httpProxy = require("http-proxy");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 4003;
const S3_BASE_PATH = process.env.S3_BASE_PATH;
const proxy = httpProxy.createProxy();

// reverse proxy to s3 bucket to server static files
app.use("/", (req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const resolvesTo = `${S3_BASE_PATH}/${subdomain}`;

  return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "index.html";
});

app.listen(PORT, () => console.log(`Reverse Proxy Running..${PORT}`));
