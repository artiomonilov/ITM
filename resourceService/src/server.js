import fs from 'node:fs';
import https from 'node:https';
import { createApp } from './app.js';
import { config } from './config.js';

const { handleRequest } = createApp(config);
const tlsOptions = {
  key: fs.readFileSync(config.tlsKeyPath),
  cert: fs.readFileSync(config.tlsCertPath)
};

const server = https.createServer(tlsOptions, async (request, response) => {
  const bodyChunks = [];

  for await (const chunk of request) {
    bodyChunks.push(chunk);
  }

  const body =
    request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH'
      ? Buffer.concat(bodyChunks).toString('utf8')
      : null;

  const result = await handleRequest({
    method: request.method,
    url: request.url,
    headers: request.headers,
    body
  });

  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
});

server.listen(config.port, config.host, () => {
  console.log(`resourceService listening on https://${config.host}:${config.port}`);
});
