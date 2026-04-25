import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { decryptValue } from '../src/crypto.js';

function basicAuthHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

test('validates AI service credentials via basic auth', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-service-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const customConfig = {
    host: '127.0.0.1',
    port: 0,
    dbPath,
    encryptionKey: Buffer.alloc(32, 7),
    vpsPool: ['10.0.0.1'],
    aiResources: {
      text: 'demo text',
      code: 'console.log("demo");',
      image: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX8nKcAAAAASUVORK5CYII=', 'base64')
    }
  };

  const { database, handleRequest } = createApp(customConfig);
  const response = await handleRequest({
    method: 'POST',
    url: '/auth/validate',
    headers: {
      authorization: basicAuthHeader('ai-service', 'ai-pass-2026')
    },
    body: JSON.stringify({ serviceName: 'AI' })
  });

  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body.toString('utf8'));
  assert.equal(payload.authenticated, true);
  assert.equal(payload.serviceName, 'AI');

  database.close();
});

test('stores service credentials encrypted in sqlite', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-service-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const encryptionKey = Buffer.alloc(32, 9);
  const customConfig = {
    host: '127.0.0.1',
    port: 0,
    dbPath,
    encryptionKey,
    vpsPool: ['10.0.0.1'],
    aiResources: {
      text: 'demo text',
      code: 'console.log("demo");',
      image: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX8nKcAAAAASUVORK5CYII=', 'base64')
    }
  };

  const { database, handleRequest } = createApp(customConfig);
  const response = await handleRequest({
    method: 'POST',
    url: '/users',
    body: JSON.stringify({
      serviceName: 'AI',
      username: 'student.demo',
      password: 'secret-pass'
    })
  });

  assert.equal(response.statusCode, 201);
  assert.equal(database.getStoredUsersCount(), 3);

  const row = database.getLatestStoredCredential();
  assert.notEqual(row.username_encrypted, 'student.demo');
  assert.notEqual(row.password_encrypted, 'secret-pass');
  assert.equal(
    decryptValue(
      {
        iv: row.username_iv,
        content: row.username_encrypted,
        authTag: row.username_auth_tag
      },
      encryptionKey
    ),
    'student.demo'
  );
  assert.equal(
    decryptValue(
      {
        iv: row.password_iv,
        content: row.password_encrypted,
        authTag: row.password_auth_tag
      },
      encryptionKey
    ),
    'secret-pass'
  );

  const authResponse = await handleRequest({
    method: 'POST',
    url: '/auth/validate',
    headers: {
      authorization: basicAuthHeader('student.demo', 'secret-pass')
    },
    body: JSON.stringify({ serviceName: 'AI' })
  });

  assert.equal(authResponse.statusCode, 200);
  database.close();
});

test('returns AI text resource and allocates VPS IPs', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resource-service-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const customConfig = {
    host: '127.0.0.1',
    port: 0,
    dbPath,
    encryptionKey: Buffer.alloc(32, 11),
    vpsPool: ['10.0.0.21', '10.0.0.22'],
    aiResources: {
      text: 'AI says hello',
      code: 'return 42;',
      image: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sX8nKcAAAAASUVORK5CYII=', 'base64')
    }
  };

  const { database, handleRequest } = createApp(customConfig);

  const aiResponse = await handleRequest({
    method: 'POST',
    url: '/resource',
    headers: {
      authorization: basicAuthHeader('ai-service', 'ai-pass-2026')
    },
    body: JSON.stringify({ serviceName: 'AI', resourceType: 'text' })
  });
  assert.equal(aiResponse.statusCode, 200);
  assert.equal(aiResponse.body.toString('utf8'), 'AI says hello');

  const imageResponse = await handleRequest({
    method: 'POST',
    url: '/resource',
    headers: {
      authorization: basicAuthHeader('ai-service', 'ai-pass-2026')
    },
    body: JSON.stringify({ serviceName: 'AI', resourceType: 'image' })
  });
  assert.equal(imageResponse.statusCode, 200);
  assert.equal(imageResponse.headers['Content-Type'], 'image/png');

  const vpsResponse = await handleRequest({
    method: 'POST',
    url: '/resource',
    headers: {
      authorization: basicAuthHeader('vps-service', 'vps-pass-2026')
    },
    body: JSON.stringify({ serviceName: 'VPS', resourceType: 'ip' })
  });
  assert.equal(vpsResponse.statusCode, 200);
  const payload = JSON.parse(vpsResponse.body.toString('utf8'));
  assert.equal(payload.ipAddress, '10.0.0.21');

  database.close();
});
