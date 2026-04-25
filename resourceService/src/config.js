import crypto from 'node:crypto';
import fs from 'node:fs';

function buildKey() {
  const seed =
    process.env.RESOURCE_SERVICE_SECRET || 'resource-service-demo-secret-2026';

  if (/^[0-9a-fA-F]{64}$/.test(seed)) {
    return Buffer.from(seed, 'hex');
  }

  return crypto.createHash('sha256').update(seed).digest();
}

function detectImageContentType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  return 'application/octet-stream';
}

function loadAiImage() {
  const fileBuffer = fs.readFileSync(new URL('../res/test.png', import.meta.url));

  return {
    data: fileBuffer,
    contentType: detectImageContentType(fileBuffer)
  };
}

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || new URL('../data/resource-service.db', import.meta.url),
  encryptionKey: buildKey(),
  tlsKeyPath: process.env.TLS_KEY_PATH || new URL('../certs/localhost-key.pem', import.meta.url),
  tlsCertPath: process.env.TLS_CERT_PATH || new URL('../certs/localhost-cert.pem', import.meta.url),
  aiResources: {
    text: 'AI resource response: platforma universitatii poate livra rezumate si explicatii pentru studenti.',
    code: [
      'function allocateTokens(total, used) {',
      '  return Math.max(total - used, 0);',
      '}',
      '',
      "console.log(allocateTokens(1500, 325));"
    ].join('\n'),
    image: loadAiImage()
  },
  vpsPool: [
    '10.10.0.11',
    '10.10.0.12',
    '10.10.0.13',
    '10.10.0.14',
    '10.10.0.15'
  ]
};
