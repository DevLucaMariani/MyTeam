/* eslint-env node */
'use strict';

// Utility di autenticazione: hashing password (scrypt, libreria standard di
// Node, nessuna dipendenza esterna) e generazione di token segreti.
// La password non viene MAI salvata in chiaro.

const crypto = require('crypto');

// Hash salato della password. Formato salvato: scrypt$<salt_hex>$<hash_hex>
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// Verifica una password contro l'hash salvato (confronto a tempo costante).
function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Token casuale (per console del trainer e link personale del cliente).
function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { hashPassword, verifyPassword, randomToken };
