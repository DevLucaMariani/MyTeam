/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'palestra',
  password: process.env.DB_PASSWORD || 'palestra_pwd',
  database: process.env.DB_NAME || 'palestra',
};

let pool;

// Attende che MariaDB sia raggiungibile (il container db puo' impiegare qualche secondo).
async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 1; i <= retries; i += 1) {
    try {
      const conn = await mysql.createConnection(config);
      await conn.ping();
      await conn.end();
      return;
    } catch (err) {
      console.log(`[db] in attesa del database (tentativo ${i}/${retries})... ${err.code || err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database non raggiungibile dopo numerosi tentativi.');
}

// Esegue lo schema (idempotente): piu' istruzioni separate da ';'.
async function applySchema() {
  const raw = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Rimuove le righe di commento "--" prima di dividere le istruzioni,
  // altrimenti un commento iniziale "inghiotte" la CREATE TABLE successiva.
  const sql = raw
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length);
  const conn = await mysql.createConnection({ ...config, multipleStatements: false });
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
  } finally {
    await conn.end();
  }
}

async function init() {
  await waitForDb();
  await applySchema();
  pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
  console.log('[db] connesso e schema applicato.');
  return pool;
}

// Helper query: ritorna le righe.
async function q(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Helper transazione: cb riceve una connection con query()/execute().
async function tx(cb) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await cb(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { init, q, tx, getPool: () => pool };
