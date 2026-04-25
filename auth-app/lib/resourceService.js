import https from 'https';
import crypto from 'crypto';

function requestJson(path, body, authHeader) {
  const payload = JSON.stringify(body);
  const serviceUrl = new URL(process.env.RESOURCE_SERVICE_URL || 'https://localhost:3000');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: serviceUrl.hostname,
      port: serviceUrl.port || 443,
      path,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
            return;
          }

          reject(new Error(parsed.message || `resourceService returned ${res.statusCode}`));
        } catch (error) {
          reject(new Error(`Raspuns invalid de la resourceService: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function buildBasicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

export async function createSubscriptionCredentialSet(baseLabel = 'subscription') {
  const username = `${baseLabel}-${crypto.randomBytes(3).toString('hex')}`;
  const password = crypto.randomBytes(6).toString('hex');

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

  return {
    username,
    password,
    ip: ipPayload.ip || ipPayload.resource || 'necunoscut',
  };
}
