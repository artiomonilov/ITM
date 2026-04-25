import http from 'http';
import https from 'https';
import crypto from 'crypto';
import ServiceCredential from '@/models/ServiceCredential';

function getServiceUrl() {
  return new URL(process.env.RESOURCE_SERVICE_URL || 'https://localhost:4000');
}

function getRequestClient(serviceUrl) {
  if (serviceUrl.protocol === 'http:') {
    return http;
  }

  if (serviceUrl.protocol === 'https:') {
    return https;
  }

  throw new Error(`Protocol nesuportat pentru resourceService: ${serviceUrl.protocol}`);
}

function buildBasicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function sanitizeUsernameSeed(seed) {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'student';
}

function isValidAllocatedIp(value) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value !== 'manual-allocation-required'
    && value !== 'necunoscut';
}

function requestService(path, body, authHeader) {
  const payload = body == null ? null : JSON.stringify(body);
  const serviceUrl = getServiceUrl();
  const client = getRequestClient(serviceUrl);
  const isHttps = serviceUrl.protocol === 'https:';

  return new Promise((resolve, reject) => {
    const req = client.request({
      hostname: serviceUrl.hostname,
      port: serviceUrl.port || (isHttps ? 443 : 80),
      path,
      method: 'POST',
      ...(isHttps ? { rejectUnauthorized: false } : {}),
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        } : {}),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    }, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const rawBody = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'application/octet-stream';
        const isJson = contentType.includes('application/json');
        const isText = contentType.startsWith('text/');

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          if (isJson) {
            try {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                body: JSON.parse(rawBody.toString('utf8') || '{}'),
              });
            } catch (error) {
              reject(new Error(`Raspuns JSON invalid de la resourceService: ${error.message}`));
            }
            return;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: isText ? rawBody.toString('utf8') : rawBody,
          });
          return;
        }

        if (isJson) {
          try {
            const parsed = JSON.parse(rawBody.toString('utf8') || '{}');
            reject(new Error(parsed.error || parsed.message || `resourceService returned ${res.statusCode}`));
            return;
          } catch (error) {
            reject(new Error(`Raspuns invalid de la resourceService: ${error.message}`));
            return;
          }
        }

        reject(new Error(`resourceService returned ${res.statusCode}`));
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function requestJson(path, body, authHeader) {
  const result = await requestService(path, body, authHeader);
  return result.body;
}

async function createServiceCredential(serviceName, usernameSeed) {
  const username = `${sanitizeUsernameSeed(usernameSeed)}-${crypto.randomBytes(3).toString('hex')}`;
  const password = crypto.randomBytes(8).toString('hex');

  await requestJson('/users', {
    serviceName,
    username,
    password,
  });

  return { username, password };
}

export async function getOrCreateUserServiceCredential({ userId, email, serviceName }) {
  const existing = await ServiceCredential.findOne({ userId, serviceName }).lean();
  if (existing) {
    return existing;
  }

  const created = await createServiceCredential(serviceName, email || `${serviceName.toLowerCase()}-user`);
  const stored = await ServiceCredential.create({
    userId,
    serviceName,
    username: created.username,
    password: created.password,
  });

  return stored.toObject();
}

export async function resetUserServiceCredential({ userId, email, serviceName }) {
  const created = await createServiceCredential(serviceName, email || `${serviceName.toLowerCase()}-user`);
  await ServiceCredential.findOneAndUpdate(
    { userId, serviceName },
    { $set: { username: created.username, password: created.password } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return created;
}

export async function requestAiResource({ username, password, resourceType, prompt }) {
  const result = await requestService(
    '/resource',
    { serviceName: 'AI', resourceType, prompt },
    buildBasicAuth(username, password),
  );

  const contentType = result.headers['content-type'] || 'application/octet-stream';
  if (Buffer.isBuffer(result.body)) {
    return {
      responseType: 'image',
      contentType,
      response: `data:${contentType};base64,${result.body.toString('base64')}`,
    };
  }

  return {
    responseType: resourceType === 'code' ? 'code' : 'text',
    contentType,
    response: result.body,
  };
}

export async function createSubscriptionCredentialSet(baseLabel = 'subscription') {
  const username = `${sanitizeUsernameSeed(baseLabel)}-${crypto.randomBytes(3).toString('hex')}`;
  const password = crypto.randomBytes(8).toString('hex');

  await requestJson('/users', {
    serviceName: 'VPS',
    username,
    password,
  });

  const ipPayload = await requestJson(
    '/resource',
    { serviceName: 'VPS', resourceType: 'ip' },
    buildBasicAuth(
      process.env.RESOURCE_SERVICE_VPS_USER || 'vps-service',
      process.env.RESOURCE_SERVICE_VPS_PASS || 'vps-pass-2026',
    ),
  );

  const allocatedIp = ipPayload.ipAddress || ipPayload.ip || ipPayload.resource || '';
  if (!isValidAllocatedIp(allocatedIp)) {
    throw new Error('resourceService nu a returnat un IP VPS valid.');
  }

  return {
    username,
    password,
    ip: allocatedIp,
    provisionedBy: 'resourceService',
  };
}
