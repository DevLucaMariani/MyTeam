/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Se l'hosting fornisce una connection string (es. Railway: MYSQL_URL /
// DATABASE_URL), la usiamo come fallback. Formato: mysql://user:pass@host:port/db
function parseDbUrl(raw) {
  if (!raw) return {};
  try {
    const u = new URL(raw);
    return {
      host: decodeURIComponent(u.hostname),
      port: u.port ? Number(u.port) : undefined,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname ? decodeURIComponent(u.pathname.replace(/^\//, '')) : undefined,
    };
  } catch (err) {
    console.warn('[db] connection string non valida, la ignoro:', err.message);
    return {};
  }
}

const url = parseDbUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);

// Priorita': variabili DB_* esplicite > variabili MYSQL* (Railway) > URL > default locali.
const config = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || url.host || '127.0.0.1',
  port: Number(process.env.DB_PORT || process.env.MYSQLPORT || url.port || 3306),
  user: process.env.DB_USER || process.env.MYSQLUSER || url.user || 'palestra',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || url.password || 'palestra_pwd',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || url.database || 'palestra',
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
  // MySQL (es. Railway) non supporta "ADD COLUMN IF NOT EXISTS" come MariaDB:
  // togliamo "IF NOT EXISTS"/"IF EXISTS" dalle ALTER e ignoriamo gli errori di
  // "gia' esistente", cosi' lo schema resta idempotente su entrambi i motori.
  const ignorableErrno = new Set([
    1050, // tabella gia' esistente
    1060, // colonna duplicata
    1061, // indice duplicato
    1091, // drop di colonna/indice inesistente
  ]);
  const adapt = (stmt) =>
    stmt
      .replace(/\bADD\s+(COLUMN|INDEX|KEY|CONSTRAINT|UNIQUE)\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD $1')
      .replace(/\bDROP\s+(COLUMN|INDEX|KEY|CONSTRAINT)\s+IF\s+EXISTS\b/gi, 'DROP $1');
  try {
    for (const stmt of statements) {
      try {
        await conn.query(adapt(stmt));
      } catch (err) {
        if (ignorableErrno.has(err.errno)) continue;
        throw err;
      }
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
