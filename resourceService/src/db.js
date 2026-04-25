import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { decryptValue, encryptValue } from './crypto.js';

const DEFAULT_SERVICE_USERS = [
  { serviceName: 'AI', username: 'ai-service', password: 'ai-pass-2026' },
  { serviceName: 'VPS', username: 'vps-service', password: 'vps-pass-2026' }
];

export class ResourceDatabase {
  constructor({ dbPath, encryptionKey, vpsPool }) {
    const resolvedPath =
      dbPath instanceof URL ? fileURLToPath(dbPath) : path.resolve(dbPath);
    const dirPath = path.dirname(resolvedPath);

    fs.mkdirSync(dirPath, { recursive: true });

    this.db = new DatabaseSync(resolvedPath);
    this.encryptionKey = encryptionKey;
    this.vpsPool = vpsPool;
  }

  initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS service_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        username_iv TEXT NOT NULL,
        username_encrypted TEXT NOT NULL,
        username_auth_tag TEXT NOT NULL,
        password_iv TEXT NOT NULL,
        password_encrypted TEXT NOT NULL,
        password_auth_tag TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vps_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        is_allocated INTEGER NOT NULL DEFAULT 0,
        allocated_at TEXT
      );
    `);

    this.seedVpsPool();
    this.seedDefaultServiceUsers();
  }

  seedDefaultServiceUsers() {
    for (const account of DEFAULT_SERVICE_USERS) {
      if (!this.findServiceUser(account.serviceName, account.username, account.password)) {
        this.createServiceUser(account.serviceName, account.username, account.password);
      }
    }
  }

  seedVpsPool() {
    const statement = this.db.prepare(`
      INSERT OR IGNORE INTO vps_resources (ip_address, is_allocated)
      VALUES (?, 0)
    `);

    for (const ip of this.vpsPool) {
      statement.run(ip);
    }
  }

  createServiceUser(serviceName, username, password) {
    const encryptedUsername = encryptValue(username, this.encryptionKey);
    const encryptedPassword = encryptValue(password, this.encryptionKey);
    const statement = this.db.prepare(`
      INSERT INTO service_users (
        service_name,
        username_iv,
        username_encrypted,
        username_auth_tag,
        password_iv,
        password_encrypted,
        password_auth_tag
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      serviceName,
      encryptedUsername.iv,
      encryptedUsername.content,
      encryptedUsername.authTag,
      encryptedPassword.iv,
      encryptedPassword.content,
      encryptedPassword.authTag
    );

    return Number(result.lastInsertRowid);
  }

  findServiceUser(serviceName, username, password) {
    const rows = this.db.prepare(`
      SELECT id,
             service_name,
             username_iv,
             username_encrypted,
             username_auth_tag,
             password_iv,
             password_encrypted,
             password_auth_tag
      FROM service_users
      WHERE service_name = ?
      ORDER BY id DESC
    `).all(serviceName);

    for (const row of rows) {
      const decryptedUsername = decryptValue(
        {
          iv: row.username_iv,
          content: row.username_encrypted,
          authTag: row.username_auth_tag
        },
        this.encryptionKey
      );
      const decryptedPassword = decryptValue(
        {
          iv: row.password_iv,
          content: row.password_encrypted,
          authTag: row.password_auth_tag
        },
        this.encryptionKey
      );

      if (decryptedUsername === username && decryptedPassword === password) {
        return {
          id: row.id,
          serviceName: row.service_name,
          username: decryptedUsername
        };
      }
    }

    return null;
  }

  allocateVpsIp() {
    const row = this.db.prepare(`
      SELECT id, ip_address
      FROM vps_resources
      WHERE is_allocated = 0
      ORDER BY id
      LIMIT 1
    `).get();

    if (!row) {
      const generatedIp = this.generateNextVpsIp();
      this.db.prepare(`
        INSERT INTO vps_resources (ip_address, is_allocated, allocated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
      `).run(generatedIp);

      return generatedIp;
    }

    this.db.prepare(`
      UPDATE vps_resources
      SET is_allocated = 1, allocated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(row.id);

    return row.ip_address;
  }

  generateNextVpsIp() {
    const row = this.db.prepare(`
      SELECT COUNT(*) AS total
      FROM vps_resources
    `).get();

    const nextIndex = Number(row?.total || 0) + 1;
    const thirdOctet = Math.floor((nextIndex - 1) / 250);
    const fourthOctet = ((nextIndex - 1) % 250) + 1;

    return `10.10.${thirdOctet}.${fourthOctet}`;
  }

  getStoredUsersCount() {
    const row = this.db.prepare(
      'SELECT COUNT(*) AS total FROM service_users'
    ).get();

    return row.total;
  }

  getLatestStoredCredential() {
    return this.db.prepare(`
      SELECT service_name,
             username_iv,
             username_encrypted,
             username_auth_tag,
             password_iv,
             password_encrypted,
             password_auth_tag
      FROM service_users
      ORDER BY id DESC
      LIMIT 1
    `).get();
  }

  close() {
    this.db.close();
  }
}
