import http from 'node:http';
import { config } from './config.js';
import { ResourceDatabase } from './db.js';

function parseBasicAuth(request) {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Basic ')) {
    return null;
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1)
  };
}

function authenticateService(request, serviceName, database) {
  const credentials = parseBasicAuth(request);

  if (!credentials) {
    return { ok: false, reason: 'Missing or invalid Basic Auth header.' };
  }

  const storedUser = database.findServiceUser(
    serviceName,
    credentials.username,
    credentials.password
  );

  if (!storedUser) {
    return { ok: false, reason: `Invalid credentials for service ${serviceName}.` };
  }

  return { ok: true, username: storedUser.username, userId: storedUser.id };
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');

  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

function validateServiceName(serviceName) {
  return serviceName === 'AI' || serviceName === 'VPS';
}

function normalizeImageResource(imageResource) {
  if (Buffer.isBuffer(imageResource)) {
    return {
      data: imageResource,
      contentType: 'image/png'
    };
  }

  return imageResource;
}

export function createApp(customConfig = config) {
  const database = new ResourceDatabase({
    dbPath: customConfig.dbPath,
    encryptionKey: customConfig.encryptionKey,
    vpsPool: customConfig.vpsPool
  });

  database.initialize();

  async function handleRequest({ method, url, headers = {}, body = null }) {
    const requestUrl = new URL(url, `https://${headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && requestUrl.pathname === '/health') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: Buffer.from(JSON.stringify({ status: 'ok' }))
        };
      }

      if (method === 'POST' && requestUrl.pathname === '/auth/validate') {
        const parsedBody = typeof body === 'string' ? JSON.parse(body || '{}') : body || {};
        const serviceName = parsedBody.serviceName;

        if (!validateServiceName(serviceName)) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: Buffer.from(JSON.stringify({ error: 'serviceName must be AI or VPS.' }))
          };
        }

        const authResult = authenticateService(
          { headers },
          serviceName,
          database
        );

        if (!authResult.ok) {
          return {
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'WWW-Authenticate': `Basic realm="${serviceName}"`
            },
            body: Buffer.from(JSON.stringify({ error: authResult.reason }))
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: Buffer.from(
            JSON.stringify({
              authenticated: true,
              serviceName,
              authUser: authResult.username
            })
          )
        };
      }

      if (method === 'POST' && requestUrl.pathname === '/users') {
        const parsedBody = typeof body === 'string' ? JSON.parse(body || '{}') : body || {};
        const { serviceName, username, password } = parsedBody;

        if (!validateServiceName(serviceName) || !username || !password) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: Buffer.from(
              JSON.stringify({ error: 'serviceName, username and password are required.' })
            )
          };
        }

        const existingUser = database.findServiceUser(
          serviceName,
          username,
          password
        );

        if (existingUser) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: Buffer.from(
              JSON.stringify({
                id: existingUser.id,
                serviceName,
                username: existingUser.username,
                message: 'Utilizatorul exista deja in baza de date.'
              })
            )
          };
        }

        const userId = database.createServiceUser(serviceName, username, password);

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: Buffer.from(
            JSON.stringify({
              id: userId,
              serviceName,
              username,
              message: 'Credentialele au fost salvate criptat in baza de date.'
            })
          )
        };
      }

      if (method === 'POST' && requestUrl.pathname === '/resource') {
        const parsedBody = typeof body === 'string' ? JSON.parse(body || '{}') : body || {};
        const { serviceName, resourceType } = parsedBody;

        if (!validateServiceName(serviceName)) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: Buffer.from(JSON.stringify({ error: 'serviceName must be AI or VPS.' }))
          };
        }

        const authResult = authenticateService(
          { headers },
          serviceName,
          database
        );

        if (!authResult.ok) {
          return {
            statusCode: 401,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'WWW-Authenticate': `Basic realm="${serviceName}"`
            },
            body: Buffer.from(JSON.stringify({ error: authResult.reason }))
          };
        }

        if (serviceName === 'AI') {
          if (!['text', 'code', 'image'].includes(resourceType)) {
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: Buffer.from(
                JSON.stringify({ error: 'For AI, resourceType must be text, code or image.' })
              )
            };
          }

          if (resourceType === 'image') {
            const imageResource = normalizeImageResource(customConfig.aiResources.image);

            return {
              statusCode: 200,
              headers: { 'Content-Type': imageResource.contentType },
              body: imageResource.data
            };
          }

          return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: Buffer.from(customConfig.aiResources[resourceType])
          };
        }

        const ipAddress = database.allocateVpsIp();

        if (!ipAddress) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: Buffer.from(JSON.stringify({ error: 'Nu mai exista VPS-uri disponibile.' }))
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: Buffer.from(
            JSON.stringify({
              serviceName: 'VPS',
              resourceType: resourceType || 'ip',
              ipAddress
            })
          )
        };
      }

      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: Buffer.from(JSON.stringify({ error: 'Route not found.' }))
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: Buffer.from(JSON.stringify({ error: 'Invalid JSON body.' }))
        };
      }

      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: Buffer.from(
          JSON.stringify({
            error: 'Unexpected server error.',
            details: error.message
          })
        )
      };
    }
  }

  const server = http.createServer(async (request, response) => {
    const body =
      request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH'
        ? await readJsonBody(request).then((payload) => JSON.stringify(payload))
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

  return { server, database, handleRequest };
}
