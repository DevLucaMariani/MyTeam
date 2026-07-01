/* eslint-env node */
'use strict';

const path = require('path');
const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const auth = require('./auth');
const webpush = require('web-push');
const pdfImport = require('./lib/pdf-import');
const { seedDemo, seedCatalog } = require('./seed');

// ---- Notifiche push (Web Push, VAPID) ------------------------------------
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '';
const PUSH_ENABLED = !!(VAPID_PUBLIC && VAPID_PRIVATE);
if (PUSH_ENABLED) {
  try { webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:mariani.pwine@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE); }
  catch (e) { console.error('[push] chiavi VAPID non valide:', e.message); }
}

// Invia una push a tutte le sottoscrizioni di un destinatario (fire-and-forget).
async function sendPush(audience, ownerId, payload) {
  if (!PUSH_ENABLED || !ownerId) return;
  const subs = await db.q('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE audience=? AND owner_id=?', [audience, ownerId]);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) {
        await db.q('DELETE FROM push_subscriptions WHERE id=?', [s.id]).catch(() => {});
      }
    }
  }));
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '15mb' })); // limite alto per le foto in base64

// ---- API ------------------------------------------------------------------
const api = express.Router();

function wrap(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      console.error('[api] errore:', err);
      res.status(500).json({ error: err.message });
    });
  };
}

// ---- Autenticazione / ruoli ----------------------------------------------
// Password amministratore: impostala su Railway come variabile ADMIN_PASSWORD.
// (Default 'admin' solo per non bloccare il primo avvio: cambiala subito.)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// Determina il ruolo della richiesta dagli header:
//  - X-Admin-Password -> amministratore (vede tutto)
//  - X-Trainer-Token  -> trainer (vede solo i propri clienti)
//  - altrimenti       -> ospite (cliente via link + endpoint pubblici)
async function resolveContext(req) {
  const adminPwd = req.get('X-Admin-Password');
  if (adminPwd && adminPwd === ADMIN_PASSWORD) return { role: 'admin' };
  const token = req.get('X-Trainer-Token');
  if (token) {
    const [t] = await db.q(
      'SELECT id, first_name, last_name, suspended, clients_unlocked FROM trainers WHERE console_token=? AND active=1',
      [token]
    );
    if (t) return { role: 'trainer', trainerId: t.id, trainer: t, suspended: !!t.suspended, clientsUnlocked: !!t.clients_unlocked };
  }
  const clientToken = req.get('X-Client-Token');
  if (clientToken) {
    const [c] = await db.q('SELECT id FROM customers WHERE access_token=?', [clientToken]);
    if (c) return { role: 'client', customerId: c.id };
  }
  return { role: 'guest' };
}

api.use((req, res, next) => {
  resolveContext(req).then((ctx) => {
    req.ctx = ctx;
    // Coach sospeso: può accedere e consultare (GET) ma non modificare nulla.
    if (ctx.role === 'trainer' && ctx.suspended && req.method !== 'GET') {
      return res.status(403).json({ error: 'Account sospeso dall\'amministratore. Non puoi effettuare modifiche.' });
    }
    // Presenza online: aggiorna "ultimo accesso" (fire-and-forget).
    if (ctx.role === 'trainer') db.q('UPDATE trainers SET last_seen=NOW() WHERE id=?', [ctx.trainerId]).catch(() => {});
    else if (ctx.role === 'client') db.q('UPDATE customers SET last_seen=NOW() WHERE id=?', [ctx.customerId]).catch(() => {});
    next();
  }).catch(next);
});

function requireAdmin(req, res, next) {
  if (req.ctx && req.ctx.role === 'admin') return next();
  return res.status(401).json({ error: "Accesso riservato all'amministratore." });
}

function requireStaff(req, res, next) {
  if (req.ctx && (req.ctx.role === 'admin' || req.ctx.role === 'trainer')) return next();
  return res.status(401).json({ error: 'Devi accedere come amministratore o trainer.' });
}

// Consente staff e cliente autenticato (col token); blocca gli ospiti anonimi.
function requireClientOrStaff(req, res, next) {
  if (req.ctx && ['admin', 'trainer', 'client'].includes(req.ctx.role)) return next();
  return res.status(401).json({ error: 'Accesso non autorizzato.' });
}

// Verifica che il contesto possa accedere ai dati di un cliente.
async function canAccessCustomer(ctx, customerId) {
  if (!ctx) return false;
  if (ctx.role === 'admin') return true;
  if (ctx.role === 'client') return Number(ctx.customerId) === Number(customerId);
  if (ctx.role === 'trainer') {
    const [c] = await db.q('SELECT id FROM customers WHERE id=? AND trainer_id=?', [customerId, ctx.trainerId]);
    return !!c;
  }
  return false;
}

// Verifica l'accesso a una scheda risalendo al cliente proprietario.
async function canAccessPlan(ctx, planId) {
  const [p] = await db.q('SELECT customer_id FROM plans WHERE id=?', [planId]);
  if (!p) return false;
  return canAccessCustomer(ctx, p.customer_id);
}

// Risponde 403 se il contesto non possiede il cliente indicato.
async function guardCustomer(req, res, customerId) {
  if (await canAccessCustomer(req.ctx, customerId)) return true;
  res.status(403).json({ error: 'Non autorizzato ad accedere a questi dati.' });
  return false;
}

// Risponde 403 se il contesto non possiede la scheda indicata.
async function guardPlan(req, res, planId) {
  if (await canAccessPlan(req.ctx, planId)) return true;
  res.status(403).json({ error: 'Non autorizzato ad accedere a questi dati.' });
  return false;
}

api.get('/health', wrap(async (_req, res) => {
  await db.q('SELECT 1');
  res.json({ ok: true });
}));

// Heartbeat presenza: l'aggiornamento di last_seen avviene nel middleware sopra.
api.get('/ping', wrap(async (_req, res) => { res.json({ ok: true }); }));

// ---- Notifiche push: chiave pubblica + sottoscrizione --------------------
api.get('/push/key', wrap(async (_req, res) => { res.json({ key: PUSH_ENABLED ? VAPID_PUBLIC : null }); }));

api.post('/push/subscribe', requireClientOrStaff, wrap(async (req, res) => {
  const sub = req.body.subscription || req.body;
  if (!sub || !sub.endpoint || !sub.keys) return res.status(400).json({ error: 'Subscription non valida.' });
  if (req.ctx.role === 'admin') return res.json({ ok: true }); // l'admin non riceve push
  const audience = req.ctx.role === 'client' ? 'client' : 'coach';
  const ownerId = req.ctx.role === 'client' ? req.ctx.customerId : req.ctx.trainerId;
  const hash = crypto.createHash('sha256').update(sub.endpoint).digest('hex');
  await db.q(
    `INSERT INTO push_subscriptions (audience, owner_id, endpoint, endpoint_hash, p256dh, auth)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE audience=VALUES(audience), owner_id=VALUES(owner_id), p256dh=VALUES(p256dh), auth=VALUES(auth)`,
    [audience, ownerId, sub.endpoint, hash, sub.keys.p256dh, sub.keys.auth]
  );
  res.json({ ok: true });
}));

// ---- Login (admin / trainer) ---------------------------------------------
api.post('/auth/admin', wrap(async (req, res) => {
  if ((req.body.password || '') === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Password non corretta.' });
}));

api.post('/auth/trainer', wrap(async (req, res) => {
  const username = (req.body.username || '').trim();
  const [t] = await db.q('SELECT * FROM trainers WHERE username=? AND active=1', [username]);
  if (!t || !auth.verifyPassword(req.body.password || '', t.password_hash)) {
    return res.status(401).json({ error: 'Credenziali non valide.' });
  }
  res.json(trainerPublic(t));
}));

// Accesso trainer tramite link diretto (?t=console_token): entra senza password.
api.get('/auth/trainer-by-token/:token', wrap(async (req, res) => {
  const [t] = await db.q('SELECT * FROM trainers WHERE console_token=? AND active=1', [req.params.token]);
  if (!t) return res.status(404).json({ error: 'Link non valido.' });
  res.json(trainerPublic(t));
}));

// ---- Catalogo esercizi ----------------------------------------------------
function parseRepsArray(raw) {
  if (!raw) return [];
  try { const a = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(a) ? a.map(String) : []; }
  catch (e) { return []; }
}

api.get('/exercise-catalog', wrap(async (_req, res) => {
  const rows = await db.q('SELECT id, name, muscle_group, default_series, default_reps, default_intensity, media_url FROM exercise_catalog ORDER BY muscle_group, name');
  rows.forEach((r) => {
    r.default_reps = parseRepsArray(r.default_reps);
    r.default_intensity = parseRepsArray(r.default_intensity);
  });
  res.json(rows);
}));

// Normalizza un nome esercizio in "Title Case": prima lettera di ogni parola
// maiuscola, il resto minuscolo (es. "hack squat"/"HACK SQUAT" -> "Hack Squat").
// Gestisce spazi multipli, trattini, slash e parentesi come separatori di parola.
function titleCaseName(raw) {
  const s = String(raw == null ? '' : raw).trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s.toLowerCase().replace(/(^|[-\s/(])([a-zà-öø-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

// Pulizia una-tantum (idempotente): porta tutti i nomi del catalogo a Title Case
// e unisce gli eventuali duplicati (che differiscono solo per maiuscole/spazi).
// Allinea anche i nomi degli esercizi nelle schede (display + join del media).
// Eseguita all'avvio: dopo il primo passaggio i dati sono gia' normalizzati (no-op).
async function normalizeCatalog(database) {
  let renamed = 0;
  let merged = 0;
  const rows = await database.q('SELECT id, name FROM exercise_catalog ORDER BY id ASC');
  const kept = new Map(); // chiave (norm minuscolo) -> true se gia' presente
  for (const r of rows) {
    const norm = titleCaseName(r.name);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (kept.has(key)) {
      await database.q('DELETE FROM exercise_catalog WHERE id=?', [r.id]);
      merged += 1;
      continue;
    }
    if (norm !== r.name) {
      try {
        await database.q('UPDATE exercise_catalog SET name=? WHERE id=?', [norm, r.id]);
        renamed += 1;
        kept.set(key, true);
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          // Il nome normalizzato esiste gia' su un'altra riga: questa e' un duplicato.
          await database.q('DELETE FROM exercise_catalog WHERE id=?', [r.id]);
          merged += 1;
        } else { throw err; }
      }
    } else {
      kept.set(key, true);
    }
  }
  // Allinea i nomi nelle schede gia' create.
  let exFixed = 0;
  const exNames = await database.q('SELECT DISTINCT name FROM plan_exercises');
  for (const r of exNames) {
    const norm = titleCaseName(r.name);
    if (norm && norm !== r.name) {
      await database.q('UPDATE plan_exercises SET name=? WHERE name=?', [norm, r.name]);
      exFixed += 1;
    }
  }
  if (renamed || merged || exFixed) {
    console.log(`[catalog] normalizzazione nomi: ${renamed} corretti, ${merged} duplicati uniti, ${exFixed} esercizi nelle schede allineati`);
  }
}

function catalogDefaults(body) {
  const series = body.default_series != null && body.default_series !== '' ? Number(body.default_series) : null;
  const arr = (v) => (Array.isArray(v) && v.length ? JSON.stringify(v.map(String)) : null);
  return { series, reps: arr(body.default_reps), intensity: arr(body.default_intensity), media: (body.media_url || '').trim() || null };
}

api.post('/exercise-catalog', wrap(async (req, res) => {
  const name = titleCaseName(req.body.name);
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });
  const { series, reps, intensity, media } = catalogDefaults(req.body);
  try {
    const r = await db.q('INSERT INTO exercise_catalog (name, muscle_group, default_series, default_reps, default_intensity, media_url) VALUES (?,?,?,?,?,?)',
      [name, (req.body.muscle_group || '').trim() || null, series, reps, intensity, media]);
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esercizio gia\' presente in catalogo' });
    throw err;
  }
}));

api.put('/exercise-catalog/:id', wrap(async (req, res) => {
  const name = titleCaseName(req.body.name);
  if (!name) return res.status(400).json({ error: 'Nome obbligatorio' });
  const { series, reps, intensity, media } = catalogDefaults(req.body);
  try {
    await db.q('UPDATE exercise_catalog SET name=?, muscle_group=?, default_series=?, default_reps=?, default_intensity=?, media_url=? WHERE id=?',
      [name, (req.body.muscle_group || '').trim() || null, series, reps, intensity, media, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esiste gia\' un esercizio con questo nome' });
    throw err;
  }
}));

api.delete('/exercise-catalog/:id', wrap(async (req, res) => {
  await db.q('DELETE FROM exercise_catalog WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Clienti --------------------------------------------------------------
api.get('/customers', requireStaff, wrap(async (req, res) => {
  const onlyMine = req.ctx.role === 'trainer';
  const rows = await db.q(
    `SELECT c.*,
            TIMESTAMPDIFF(SECOND, c.last_seen, NOW()) AS last_seen_secs,
            (SELECT COUNT(*) FROM plans p WHERE p.customer_id = c.id) AS plans_count,
            (SELECT COUNT(*) FROM plans p WHERE p.customer_id = c.id AND p.status='attiva') AS active_plans,
            (SELECT COALESCE(SUM(amount),0) FROM customer_payments cp WHERE cp.customer_id = c.id AND cp.paid=0) AS unpaid_total
     FROM customers c ${onlyMine ? 'WHERE c.trainer_id = :tid' : ''} ORDER BY c.last_name, c.first_name`,
    onlyMine ? { tid: req.ctx.trainerId } : undefined
  );
  res.json(rows);
}));

api.get('/customers/:id', requireStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  const [c] = await db.q('SELECT c.*, TIMESTAMPDIFF(SECOND, c.last_seen, NOW()) AS last_seen_secs FROM customers c WHERE c.id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Cliente non trovato' });
  res.json(c);
}));

// ---- Pagamenti del cliente (registro spese gestito dal coach) -------------
const PAYMENT_TYPES = ['abbonamento', 'schede', 'extra', 'altro'];
function paymentBody(b) {
  let type = String(b.type || 'altro').toLowerCase();
  if (!PAYMENT_TYPES.includes(type)) type = 'altro';
  let amount = (b.amount === '' || b.amount == null) ? null : Number(b.amount);
  if (amount != null && (Number.isNaN(amount) || amount < 0)) amount = null;
  const paid = (b.paid === 1 || b.paid === '1' || b.paid === true || b.paid === 'true') ? 1 : 0;
  return { type, amount, paid, due_date: b.due_date || null, note: (b.note || '').trim() || null };
}

api.get('/customers/:id/payments', requireStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  res.json(await db.q(
    'SELECT * FROM customer_payments WHERE customer_id=? ORDER BY COALESCE(due_date, created_at) DESC, id DESC',
    [req.params.id]
  ));
}));

api.post('/customers/:id/payments', requireStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  const p = paymentBody(req.body);
  const r = await db.q(
    'INSERT INTO customer_payments (customer_id, type, amount, paid, due_date, note) VALUES (?,?,?,?,?,?)',
    [req.params.id, p.type, p.amount, p.paid, p.due_date, p.note]
  );
  const [row] = await db.q('SELECT * FROM customer_payments WHERE id=?', [r.insertId]);
  res.status(201).json(row);
}));

api.put('/payments/:id', requireStaff, wrap(async (req, res) => {
  const [pay] = await db.q('SELECT customer_id FROM customer_payments WHERE id=?', [req.params.id]);
  if (!pay) return res.status(404).json({ error: 'Voce non trovata.' });
  if (!(await guardCustomer(req, res, pay.customer_id))) return;
  const p = paymentBody(req.body);
  await db.q(
    'UPDATE customer_payments SET type=?, amount=?, paid=?, due_date=?, note=? WHERE id=?',
    [p.type, p.amount, p.paid, p.due_date, p.note, req.params.id]
  );
  const [row] = await db.q('SELECT * FROM customer_payments WHERE id=?', [req.params.id]);
  res.json(row);
}));

api.delete('/payments/:id', requireStaff, wrap(async (req, res) => {
  const [pay] = await db.q('SELECT customer_id FROM customer_payments WHERE id=?', [req.params.id]);
  if (!pay) return res.status(404).json({ error: 'Voce non trovata.' });
  if (!(await guardCustomer(req, res, pay.customer_id))) return;
  await db.q('DELETE FROM customer_payments WHERE id=?', [req.params.id]);
  res.status(204).end();
}));

const CUSTOMER_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'birth_date', 'birth_place', 'gender', 'codice_fiscale',
  'address', 'address_cap', 'address_city', 'address_province', 'address_country',
  'height_cm', 'weight_kg', 'fat_mass_pct', 'lean_mass_kg', 'waist_cm',
  'goal', 'subscription', 'subscription_expiry',
  'payment_method', 'subscription_type', 'subscription_cadence', 'subscription_cost',
  'fee_amount', 'paid', 'paid_date', 'notes',
];

function pick(body, fields) {
  const out = {};
  fields.forEach((f) => {
    let v = body[f];
    if (v === '' || v === undefined) v = null;
    // 'paid' e' un booleano: sempre 0/1 (colonna NOT NULL)
    if (f === 'paid') v = (v === 1 || v === '1' || v === true || v === 'true') ? 1 : 0;
    out[f] = v;
  });
  return out;
}

api.post('/customers', requireStaff, wrap(async (req, res) => {
  // Limite gratuito: un coach non sbloccato può avere al massimo 2 clienti.
  if (req.ctx.role === 'trainer' && !req.ctx.clientsUnlocked) {
    const [cnt] = await db.q('SELECT COUNT(*) AS n FROM customers WHERE trainer_id=?', [req.ctx.trainerId]);
    if (Number(cnt.n) >= 2) {
      return res.status(403).json({ error: 'Hai raggiunto il limite gratuito di 2 clienti. Chiedi all\'amministratore di sbloccarne altri.' });
    }
  }
  const data = pick(req.body, CUSTOMER_FIELDS);
  // Il coach assegna il cliente a se stesso; l'admin puo' indicare trainer_id.
  data.trainer_id = req.ctx.role === 'trainer' ? req.ctx.trainerId : (req.body.trainer_id || null);
  data.access_token = auth.randomToken(); // link personale permanente del cliente
  const cols = [...CUSTOMER_FIELDS, 'trainer_id', 'access_token'];
  const ph = cols.map((f) => `:${f}`).join(',');
  const result = await db.q(`INSERT INTO customers (${cols.join(',')}) VALUES (${ph})`, data);
  const [c] = await db.q('SELECT * FROM customers WHERE id=?', [result.insertId]);
  res.status(201).json(c);
}));

api.put('/customers/:id', requireStaff, wrap(async (req, res) => {
  const data = pick(req.body, CUSTOMER_FIELDS);
  data.id = req.params.id;
  const setClause = CUSTOMER_FIELDS.map((f) => `${f}=:${f}`).join(', ');
  await db.q(`UPDATE customers SET ${setClause} WHERE id=:id`, data);
  const [c] = await db.q('SELECT * FROM customers WHERE id=?', [req.params.id]);
  res.json(c);
}));

api.delete('/customers/:id', requireStaff, wrap(async (req, res) => {
  await db.q('DELETE FROM customers WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

api.get('/customers/:id/plans', requireStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  const rows = await db.q(
    'SELECT * FROM plans WHERE customer_id=? ORDER BY status="attiva" DESC, updated_at DESC',
    [req.params.id]
  );
  res.json(rows);
}));

// Elenco schede del cliente (storico): attive e concluse, NON le bozze.
api.get('/customers/:id/client-plans', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  res.json(await db.q(
    `SELECT id, name, status, duration_weeks, start_date, end_date, version, updated_at
     FROM plans WHERE customer_id=? AND status<>'bozza'
     ORDER BY (status='attiva') DESC, updated_at DESC`,
    [req.params.id]
  ));
}));

// Piano attivo del cliente (per la dashboard PWA).
api.get('/customers/:id/active-plan', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  const [p] = await db.q(
    "SELECT * FROM plans WHERE customer_id=? AND status='attiva' ORDER BY updated_at DESC LIMIT 1",
    [req.params.id]
  );
  if (!p) return res.json(null);
  res.json(await loadFullPlan(p.id));
}));

// ---- Piani (schede) -------------------------------------------------------

// Normalizza lo schema ripetizioni assicurando array di lunghezza num_series.
function parseReps(raw, numSeries) {
  let scheme = { default: [], overrides: {} };
  if (raw) {
    try { scheme = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { /* default */ }
  }
  if (!scheme || typeof scheme !== 'object') scheme = { default: [], overrides: {} };
  if (!Array.isArray(scheme.default)) scheme.default = [];
  if (!scheme.overrides || typeof scheme.overrides !== 'object') scheme.overrides = {};
  const n = Number(numSeries) || scheme.default.length || 1;
  const fit = (arr) => {
    const out = [];
    for (let i = 0; i < n; i += 1) out.push(arr && arr[i] != null ? String(arr[i]) : '');
    return out;
  };
  scheme.default = fit(scheme.default);
  Object.keys(scheme.overrides).forEach((w) => { scheme.overrides[w] = fit(scheme.overrides[w]); });
  return scheme;
}

async function loadFullPlan(planId) {
  const [plan] = await db.q('SELECT * FROM plans WHERE id=?', [planId]);
  if (!plan) return null;
  const days = await db.q('SELECT * FROM plan_days WHERE plan_id=? ORDER BY position, id', [planId]);
  const exercises = await db.q(
    `SELECT e.*,
            (SELECT c.media_url FROM exercise_catalog c WHERE c.name = e.name LIMIT 1) AS media_url
     FROM plan_exercises e
     JOIN plan_days d ON d.id = e.day_id
     WHERE d.plan_id=? ORDER BY e.position, e.id`,
    [planId]
  );
  exercises.forEach((e) => {
    e.reps_scheme = parseReps(e.reps_scheme, e.num_series);
    e.intensity_scheme = parseReps(e.intensity_scheme, e.num_series);
    e.deload_scheme = parseReps(e.deload_scheme, e.num_series);
    e.backoff_scheme = parseReps(e.backoff_scheme, e.num_series);
  });
  days.forEach((d) => {
    d.exercises = exercises.filter((e) => e.day_id === d.id);
  });
  const nutrition = await db.q('SELECT * FROM nutrition WHERE plan_id=?', [planId]);
  const versions = await db.q('SELECT * FROM plan_versions WHERE plan_id=? ORDER BY version DESC', [planId]);
  plan.days = days;
  plan.nutrition = {
    allenamento: nutrition.find((n) => n.day_type === 'allenamento') || null,
    riposo: nutrition.find((n) => n.day_type === 'riposo') || null,
  };
  // Dieta giornaliera dettagliata (pasti con alimenti/grammi/macro).
  try { plan.diet = plan.diet_json ? JSON.parse(plan.diet_json) : []; } catch (e) { plan.diet = []; }
  if (!Array.isArray(plan.diet)) plan.diet = [];
  plan.versions = versions;
  return plan;
}

// Schede attive ordinate per scadenza (definita PRIMA di /plans/:id).
api.get('/plans/overview', requireStaff, wrap(async (req, res) => {
  const onlyMine = req.ctx.role === 'trainer';
  res.json(await db.q(
    `SELECT p.id, p.name, p.status, p.duration_weeks, p.start_date, p.end_date, p.customer_id,
            c.first_name, c.last_name, TIMESTAMPDIFF(SECOND, c.last_seen, NOW()) AS last_seen_secs
     FROM plans p JOIN customers c ON c.id = p.customer_id
     WHERE p.status = 'attiva' ${onlyMine ? 'AND c.trainer_id = :tid' : ''}
     ORDER BY p.end_date IS NULL, p.end_date ASC`,
    onlyMine ? { tid: req.ctx.trainerId } : undefined
  ));
}));

api.get('/plans/:id', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardPlan(req, res, req.params.id))) return;
  const plan = await loadFullPlan(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Scheda non trovata' });
  res.json(plan);
}));

// Crea una scheda completa (struttura + nutrizione) in transazione.
// La dieta giornaliera dettagliata è un modulo extra: se il coach non ce l'ha
// attivo dall'admin, la ignoriamo (l'admin può sempre usarla).
async function enforceDietModule(ctx, body) {
  if (ctx.role !== 'trainer') return;
  const [t] = await db.q('SELECT modules FROM trainers WHERE id=?', [ctx.trainerId]);
  if (!parseModules(t && t.modules).advanced_diet) body.diet = [];
}

api.post('/plans', requireStaff, wrap(async (req, res) => {
  await enforceDietModule(req.ctx, req.body);
  const id = await db.tx(async (conn) => {
    const planId = await insertPlanGraph(conn, req.body);
    return planId;
  });
  res.status(201).json(await loadFullPlan(id));
}));

// Salva/aggiorna struttura: se la scheda e' attiva, incrementa la versione.
api.put('/plans/:id', requireStaff, wrap(async (req, res) => {
  await enforceDietModule(req.ctx, req.body);
  const planId = Number(req.params.id);
  await db.tx(async (conn) => {
    const [existing] = await conn.query('SELECT * FROM plans WHERE id=?', [planId]);
    const cur = existing[0];
    if (!cur) throw new Error('Scheda non trovata');

    const body = req.body;
    let version = cur.version;
    // Modifica di una scheda attiva -> nuova versione + storico.
    if (cur.status === 'attiva') {
      version += 1;
      await conn.query(
        'INSERT INTO plan_versions (plan_id, version, note) VALUES (?,?,?)',
        [planId, version, body.versionNote || 'Modifica scheda attiva']
      );
      // Notifica al cliente: scheda aggiornata.
      await conn.query(
        'INSERT INTO notifications (type, audience, customer_id, plan_id, message) VALUES (?,?,?,?,?)',
        ['plan_updated', 'client', cur.customer_id, planId, `La tua scheda "${body.name}" è stata aggiornata dall'istruttore (versione ${version}).`]
      );
    }

    await conn.query(
      `UPDATE plans SET name=?, duration_weeks=?, version=?, start_date=?, end_date=?, price=?,
              nutrition_advice=?, diet_json=? WHERE id=?`,
      [body.name, Number(body.duration_weeks) || 8, version, body.start_date || null, body.end_date || null, priceVal(body.price),
        (body.nutrition_advice || '').trim() || null, JSON.stringify(Array.isArray(body.diet) ? body.diet : []), planId]
    );

    // Riscrive struttura e nutrizione.
    await conn.query('DELETE FROM plan_days WHERE plan_id=?', [planId]);
    await conn.query('DELETE FROM nutrition WHERE plan_id=?', [planId]);
    await writeDaysAndNutrition(conn, planId, body);
  });
  res.json(await loadFullPlan(planId));
}));

api.post('/plans/:id/activate', requireStaff, wrap(async (req, res) => {
  const planId = Number(req.params.id);
  if (!(await guardPlan(req, res, planId))) return;
  const [info] = await db.q('SELECT customer_id, name FROM plans WHERE id=?', [planId]);
  if (!info) return res.status(404).json({ error: 'Scheda non trovata' });
  // Una sola scheda attiva per cliente: le altre attive diventano "archiviata".
  await db.q("UPDATE plans SET status='archiviata' WHERE customer_id=? AND id<>? AND status='attiva'", [info.customer_id, planId]);
  await db.q("UPDATE plans SET status='attiva' WHERE id=?", [planId]);
  // Notifica al cliente: scheda inviata.
  await db.q(
    'INSERT INTO notifications (type, audience, customer_id, plan_id, message) VALUES (?,?,?,?,?)',
    ['new_plan', 'client', info.customer_id, planId, `È disponibile una nuova scheda per te: "${info.name}". Buon allenamento!`]
  );
  sendPush('client', info.customer_id, { title: 'MyTeam', body: `È disponibile una nuova scheda: "${info.name}"`, url: '/' }).catch(() => {});
  res.json(await loadFullPlan(planId));
}));

api.delete('/plans/:id', requireStaff, wrap(async (req, res) => {
  if (!(await guardPlan(req, res, req.params.id))) return;
  await db.q('DELETE FROM plans WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// Duplica struttura + nutrizione (NON i progressi) verso stesso o altro cliente.
api.post('/plans/:id/duplicate', requireStaff, wrap(async (req, res) => {
  const srcId = Number(req.params.id);
  const targetCustomerId = Number(req.body.targetCustomerId);
  const src = await loadFullPlan(srcId);
  if (!src) return res.status(404).json({ error: 'Scheda non trovata' });

  const graph = {
    customer_id: targetCustomerId || src.customer_id,
    name: req.body.name || `${src.name} (copia)`,
    duration_weeks: src.duration_weeks,
    status: 'bozza',
    price: src.price,
    nutrition_advice: src.nutrition_advice,
    diet: src.diet,
    days: src.days.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => ({
        name: e.name, num_series: e.num_series, reps_scheme: e.reps_scheme, intensity_scheme: e.intensity_scheme,
        suggested_weight: e.suggested_weight, rest: e.rest, notes: e.notes, superset_group: e.superset_group,
        unilateral: e.unilateral, ex_type: e.ex_type, deload_scheme: e.deload_scheme, backoff_scheme: e.backoff_scheme,
        cardio_mode: e.cardio_mode, cardio_duration: e.cardio_duration, cardio_intensity: e.cardio_intensity,
      })),
    })),
    nutrition: src.nutrition,
  };
  const newId = await db.tx(async (conn) => insertPlanGraph(conn, graph));
  res.status(201).json(await loadFullPlan(newId));
}));

// Normalizza il prezzo della scheda: numero >= 0 oppure null.
function priceVal(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// Inserisce un piano completo (usato da create e duplicate).
async function insertPlanGraph(conn, body) {
  const [r] = await conn.query(
    `INSERT INTO plans (customer_id, name, duration_weeks, status, version, start_date, end_date, price, nutrition_advice, diet_json)
     VALUES (?,?,?,?,1,?,?,?,?,?)`,
    [body.customer_id, body.name, Number(body.duration_weeks) || 8, body.status || 'bozza',
      body.start_date || null, body.end_date || null, priceVal(body.price),
      (body.nutrition_advice || '').trim() || null, JSON.stringify(Array.isArray(body.diet) ? body.diet : [])]
  );
  const planId = r.insertId;
  await writeDaysAndNutrition(conn, planId, body);
  return planId;
}

async function writeDaysAndNutrition(conn, planId, body) {
  const days = Array.isArray(body.days) ? body.days : [];
  for (let i = 0; i < days.length; i += 1) {
    const d = days[i];
    const [dr] = await conn.query(
      'INSERT INTO plan_days (plan_id, position, name) VALUES (?,?,?)',
      [planId, i, d.name || `Giorno ${i + 1}`]
    );
    const dayId = dr.insertId;
    const exs = Array.isArray(d.exercises) ? d.exercises : [];
    for (let j = 0; j < exs.length; j += 1) {
      const e = exs[j];
      const numSeries = Number(e.num_series) || 1;
      const scheme = parseReps(e.reps_scheme, numSeries);
      const intensity = parseReps(e.intensity_scheme, numSeries);
      const deload = parseReps(e.deload_scheme, numSeries);
      const backoff = parseReps(e.backoff_scheme, numSeries);
      const exName = titleCaseName(e.name);
      await conn.query(
        `INSERT INTO plan_exercises (day_id, position, name, num_series, suggested_weight, rest, notes, reps_scheme, intensity_scheme, superset_group, unilateral, ex_type, deload_scheme, backoff_scheme, cardio_mode, cardio_duration, cardio_intensity)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [dayId, j, exName || 'Esercizio', numSeries,
          e.suggested_weight || null, e.rest || null, e.notes || null, JSON.stringify(scheme), JSON.stringify(intensity),
          (e.superset_group || '').trim() || null, e.unilateral ? 1 : 0,
          (e.ex_type || '').trim() || null, JSON.stringify(deload), JSON.stringify(backoff),
          (e.cardio_mode || '').trim() || null, (e.cardio_duration || '').trim() || null, (e.cardio_intensity || '').trim() || null]
      );
      // Salva il nome nel catalogo se non gia' presente (anche se rinominato a mano),
      // con serie, ripetizioni e intensita' come default per i riutilizzi futuri.
      if (exName) {
        await conn.query('INSERT IGNORE INTO exercise_catalog (name, default_series, default_reps, default_intensity) VALUES (?,?,?,?)',
          [exName, numSeries, JSON.stringify(scheme.default), JSON.stringify(intensity.default)]);
      }
    }
  }
  const nut = body.nutrition || {};
  for (const type of ['allenamento', 'riposo']) {
    const n = nut[type];
    if (n && (n.calories || n.protein_g || n.carbs_g || n.fat_g || n.water_l)) {
      await conn.query(
        `INSERT INTO nutrition (plan_id, day_type, calories, protein_g, carbs_g, fat_g, water_l)
         VALUES (?,?,?,?,?,?,?)`,
        [planId, type, n.calories || null, n.protein_g || null, n.carbs_g || null,
          n.fat_g || null, n.water_l || null]
      );
    }
  }
}

// ---- Import scheda da PDF (best-effort) ----------------------------------
api.post('/import/pdf', requireStaff, wrap(async (req, res) => {
  // L'import da PDF è un modulo extra: il coach lo usa solo se l'admin l'ha attivato.
  if (req.ctx.role === 'trainer') {
    const [t] = await db.q('SELECT modules FROM trainers WHERE id=?', [req.ctx.trainerId]);
    if (!parseModules(t && t.modules).pdf_import) {
      return res.status(403).json({ error: "Import da PDF non attivo per il tuo account. Chiedi all'amministratore di abilitarlo." });
    }
  }
  const b64 = req.body.pdf_base64 || '';
  const comma = b64.indexOf(',');
  const data = comma >= 0 ? b64.slice(comma + 1) : b64; // rimuove "data:...;base64,"
  if (!data) return res.status(400).json({ error: 'Nessun PDF ricevuto.' });
  const draft = await pdfImport.importPdfBuffer(Buffer.from(data, 'base64'));
  res.json(draft);
}));

// ---- Log esercizi (compilazione cliente) ---------------------------------
api.get('/plans/:id/logs', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardPlan(req, res, req.params.id))) return;
  const week = Number(req.query.week);
  const params = [req.params.id];
  let sql = 'SELECT * FROM exercise_logs WHERE plan_id=?';
  if (week) { sql += ' AND week_number=?'; params.push(week); }
  res.json(await db.q(sql, params));
}));

api.put('/logs', requireClientOrStaff, wrap(async (req, res) => {
  const { planId, exerciseId, week, seriesIndex, actualWeight, completed } = req.body;
  if (!(await guardPlan(req, res, planId))) return;
  await db.q(
    `INSERT INTO exercise_logs (plan_id, exercise_id, week_number, series_index, actual_weight, completed)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE actual_weight=VALUES(actual_weight), completed=VALUES(completed)`,
    [planId, exerciseId, week, Number(seriesIndex) || 1, actualWeight || null, completed ? 1 : 0]
  );
  res.json({ ok: true });
}));

// ---- Aggiornamenti settimanali -------------------------------------------
api.get('/plans/:id/weekly-updates', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardPlan(req, res, req.params.id))) return;
  res.json(await db.q(
    'SELECT * FROM weekly_updates WHERE plan_id=? ORDER BY week_number DESC, sent_at DESC',
    [req.params.id]
  ));
}));

api.post('/plans/:id/weekly-updates', requireClientOrStaff, wrap(async (req, res) => {
  const planId = Number(req.params.id);
  if (!(await guardPlan(req, res, planId))) return;
  const { week } = req.body;
  // Calcola completamento dai log della settimana (totale = somma delle serie).
  const [tot] = await db.q(
    `SELECT COALESCE(SUM(e.num_series),0) AS total FROM plan_exercises e
     JOIN plan_days d ON d.id=e.day_id WHERE d.plan_id=?`, [planId]
  );
  const [done] = await db.q(
    'SELECT COUNT(*) AS done FROM exercise_logs WHERE plan_id=? AND week_number=? AND completed=1',
    [planId, week]
  );
  const total = tot.total || 0;
  const doneCount = done.done || 0;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  await db.q(
    `INSERT INTO weekly_updates (plan_id, week_number, exercises_done, total_exercises, percent_complete, note)
     VALUES (?,?,?,?,?,?)`,
    [planId, week, doneCount, total, percent, req.body.note || null]
  );
  // Genera una notifica per l'amministratore.
  const [info] = await db.q(
    'SELECT p.customer_id, p.name AS plan_name, c.first_name, c.last_name FROM plans p JOIN customers c ON c.id=p.customer_id WHERE p.id=?',
    [planId]
  );
  if (info) {
    const msg = `${info.first_name} ${info.last_name} ha inviato l'aggiornamento della settimana ${week} (${percent}% completato) — ${info.plan_name}.`;
    await db.q(
      'INSERT INTO notifications (type, customer_id, plan_id, week_number, message) VALUES (?,?,?,?,?)',
      ['weekly_update', info.customer_id, planId, week, msg]
    );
    const [own] = await db.q('SELECT trainer_id FROM customers WHERE id=?', [info.customer_id]);
    if (own && own.trainer_id) {
      sendPush('coach', own.trainer_id, { title: 'MyTeam', body: `${info.first_name} ${info.last_name}: aggiornamento sett. ${week} (${percent}%)`, url: '/' }).catch(() => {});
    }
  }
  res.status(201).json({ ok: true, exercises_done: doneCount, total_exercises: total, percent_complete: percent });
}));

// ---- Notifiche (amministratore / trainer) --------------------------------
// Il trainer vede solo le notifiche relative ai propri clienti.
api.get('/notifications', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role === 'trainer') {
    return res.json(await db.q(
      `SELECT n.* FROM notifications n
       JOIN customers c ON c.id = n.customer_id
       WHERE n.audience='admin' AND c.trainer_id=:tid
       ORDER BY n.created_at DESC, n.id DESC LIMIT 200`,
      { tid: req.ctx.trainerId }
    ));
  }
  res.json(await db.q("SELECT * FROM notifications WHERE audience='admin' ORDER BY created_at DESC, id DESC LIMIT 200"));
}));

api.post('/notifications/:id/read', requireStaff, wrap(async (req, res) => {
  await db.q('UPDATE notifications SET is_read=1 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

api.post('/notifications/read-all', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role === 'trainer') {
    await db.q(
      `UPDATE notifications n JOIN customers c ON c.id = n.customer_id
       SET n.is_read=1 WHERE n.audience='admin' AND n.is_read=0 AND c.trainer_id=?`,
      [req.ctx.trainerId]
    );
  } else {
    await db.q("UPDATE notifications SET is_read=1 WHERE audience='admin' AND is_read=0");
  }
  res.json({ ok: true });
}));

api.delete('/notifications/:id', requireStaff, wrap(async (req, res) => {
  await db.q('DELETE FROM notifications WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// Notifiche del cliente (lato PWA).
api.get('/customers/:id/notifications', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  res.json(await db.q(
    "SELECT * FROM notifications WHERE audience='client' AND customer_id=? ORDER BY created_at DESC, id DESC LIMIT 100",
    [req.params.id]
  ));
}));

api.post('/customers/:id/notifications/read-all', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardCustomer(req, res, req.params.id))) return;
  await db.q("UPDATE notifications SET is_read=1 WHERE audience='client' AND customer_id=? AND is_read=0", [req.params.id]);
  res.json({ ok: true });
}));

// ---- Foto progressi -------------------------------------------------------
api.get('/plans/:id/photos', requireClientOrStaff, wrap(async (req, res) => {
  if (!(await guardPlan(req, res, req.params.id))) return;
  res.json(await db.q(
    'SELECT id, plan_id, customer_id, photo_type, image_data, taken_at FROM progress_photos WHERE plan_id=? ORDER BY taken_at DESC',
    [req.params.id]
  ));
}));

api.post('/plans/:id/photos', requireClientOrStaff, wrap(async (req, res) => {
  const planId = Number(req.params.id);
  if (!(await guardPlan(req, res, planId))) return;
  const [plan] = await db.q('SELECT customer_id FROM plans WHERE id=?', [planId]);
  if (!plan) return res.status(404).json({ error: 'Scheda non trovata' });
  const r = await db.q(
    'INSERT INTO progress_photos (plan_id, customer_id, photo_type, image_data) VALUES (?,?,?,?)',
    [planId, plan.customer_id, req.body.photo_type || 'libera', req.body.image_data]
  );
  res.status(201).json({ id: r.insertId });
}));

api.delete('/photos/:id', requireClientOrStaff, wrap(async (req, res) => {
  const [ph] = await db.q('SELECT customer_id FROM progress_photos WHERE id=?', [req.params.id]);
  if (!ph) return res.json({ ok: true });
  if (!(await guardCustomer(req, res, ph.customer_id))) return;
  await db.q('DELETE FROM progress_photos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// ---- Registrazione trainer tramite sponsorizzazione (pubblici) -----------
api.get('/invite/:code', wrap(async (req, res) => {
  const [t] = await db.q('SELECT first_name, last_name FROM trainers WHERE invite_code=? AND active=1', [req.params.code]);
  if (!t) return res.status(404).json({ error: 'Invito non valido.' });
  res.json({ first_name: t.first_name, last_name: t.last_name });
}));

api.post('/trainers/register', wrap(async (req, res) => {
  const code = (req.body.invite_code || '').trim();
  const [sponsor] = await db.q('SELECT id FROM trainers WHERE invite_code=? AND active=1', [code]);
  if (!sponsor) return res.status(400).json({ error: 'Codice invito non valido.' });
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!req.body.first_name || !req.body.last_name) return res.status(400).json({ error: 'Nome e cognome obbligatori.' });
  if (!username || !password) return res.status(400).json({ error: 'Nome utente e password obbligatori.' });
  try {
    await db.q(
      `INSERT INTO trainers (first_name, last_name, email, phone, username, password_hash, console_token, invite_code, sponsor_id, active)
       VALUES (?,?,?,?,?,?,?,?,?,0)`,
      [req.body.first_name, req.body.last_name, req.body.email || null, req.body.phone || null,
        username, auth.hashPassword(password), auth.randomToken(), auth.randomToken(8), sponsor.id]
    );
    res.status(201).json({ ok: true, pending: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Nome utente gia' in uso." });
    throw err;
  }
}));

// ---- Trainer (gestiti dall'amministratore) -------------------------------
// Nota: logo e tema NON sono qui: li gestisce il trainer da sé (/me/branding),
// cosi' un salvataggio del profilo lato admin non li azzera.
const TRAINER_FIELDS = ['first_name', 'last_name', 'email', 'phone', 'bio', 'photo'];

// Moduli/servizi extra attivabili dall'amministratore per ogni coach.
const MODULE_KEYS = ['advanced_appearance', 'pdf_import', 'advanced_diet'];
function parseModules(raw) {
  if (!raw) return {};
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

function trainerPublic(t) {
  return {
    id: t.id, first_name: t.first_name, last_name: t.last_name,
    email: t.email, phone: t.phone, bio: t.bio, photo: t.photo,
    username: t.username, active: t.active, created_at: t.created_at,
    console_token: t.console_token, // serve all'admin per generare il link di accesso
    logo: t.logo, theme_accent: t.theme_accent, theme_mode: t.theme_mode,
    theme_bg: t.theme_bg, theme_surface: t.theme_surface,
    brand_name: t.brand_name, welcome_message: t.welcome_message,
    sponsor_id: t.sponsor_id, invite_code: t.invite_code, commission_override: t.commission_override,
    suspended: t.suspended, clients_unlocked: t.clients_unlocked,
    nutrition_enabled: t.nutrition_enabled, team_enabled: t.team_enabled,
    modules: parseModules(t.modules),
  };
}

// Tasso effettivo: override admin (10/5/0) se impostato, altrimenti automatico
// (10%, oppure 5% se il trainer ha portato >= 3 trainer sponsorizzati e attivi).
function effectiveRate(t, sponsoredCount) {
  const ov = t.commission_override;
  if (ov === 0 || ov === 5 || ov === 10) return ov;
  return sponsoredCount >= 3 ? 5 : 10;
}

// Riepilogo compensi di un trainer: primi 2 clienti gratis, dal terzo si paga
// il tasso percentuale sulle voci di pagamento di tipo "abbonamento" e "schede"
// effettivamente PAGATE. Le prestazioni extra/altro non generano compenso.
async function trainerBilling(t) {
  const FREE = 2;
  const clients = await db.q('SELECT id FROM customers WHERE trainer_id=? ORDER BY created_at, id', [t.id]);
  const billableIds = clients.slice(FREE).map((c) => c.id);
  const [sp] = await db.q('SELECT COUNT(*) AS n FROM trainers WHERE sponsor_id=? AND active=1', [t.id]);
  const sponsoredCount = Number(sp.n) || 0;
  const rate = effectiveRate(t, sponsoredCount);
  let billableItems = 0;
  let revenue = 0;
  if (billableIds.length) {
    const [agg] = await db.q(
      `SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS tot FROM customer_payments
       WHERE paid=1 AND amount > 0 AND type IN ('abbonamento','schede') AND customer_id IN (?)`,
      [billableIds]
    );
    billableItems = Number(agg.n) || 0;
    revenue = Number(agg.tot) || 0;
  }
  return {
    clients_count: clients.length, free_clients: FREE, sponsored_count: sponsoredCount,
    rate, billable_plans: billableItems, billable_revenue: revenue,
    owed: Math.round(revenue * rate) / 100,
  };
}

api.get('/trainers', requireAdmin, wrap(async (_req, res) => {
  const rows = await db.q(
    `SELECT t.*,
            TIMESTAMPDIFF(SECOND, t.last_seen, NOW()) AS last_seen_secs,
            (SELECT COUNT(*) FROM customers c WHERE c.trainer_id = t.id) AS customers_count,
            (SELECT COUNT(*) FROM trainers s WHERE s.sponsor_id = t.id AND s.active=1) AS sponsored_count
     FROM trainers t ORDER BY t.active ASC, t.last_name, t.first_name`
  );
  res.json(rows.map((t) => ({
    ...trainerPublic(t),
    customers_count: t.customers_count,
    sponsored_count: Number(t.sponsored_count) || 0,
    rate: effectiveRate(t, Number(t.sponsored_count) || 0),
    last_seen_secs: t.last_seen_secs,
  })));
}));

api.post('/trainers', requireAdmin, wrap(async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!req.body.first_name || !req.body.last_name) return res.status(400).json({ error: 'Nome e cognome obbligatori.' });
  if (!username || !password) return res.status(400).json({ error: 'Nome utente e password obbligatori.' });
  const data = pick(req.body, TRAINER_FIELDS);
  data.username = username;
  data.password_hash = auth.hashPassword(password);
  data.console_token = auth.randomToken();
  data.invite_code = auth.randomToken(8);
  const cols = [...TRAINER_FIELDS, 'username', 'password_hash', 'console_token', 'invite_code'];
  const ph = cols.map((f) => `:${f}`).join(',');
  try {
    const r = await db.q(`INSERT INTO trainers (${cols.join(',')}) VALUES (${ph})`, data);
    const [t] = await db.q('SELECT * FROM trainers WHERE id=?', [r.insertId]);
    res.status(201).json(trainerPublic(t));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: "Nome utente gia' in uso." });
    throw err;
  }
}));

api.put('/trainers/:id', requireAdmin, wrap(async (req, res) => {
  const data = pick(req.body, TRAINER_FIELDS);
  data.id = req.params.id;
  const setClause = TRAINER_FIELDS.map((f) => `${f}=:${f}`).join(', ');
  await db.q(`UPDATE trainers SET ${setClause} WHERE id=:id`, data);
  if (req.body.password) {
    await db.q('UPDATE trainers SET password_hash=? WHERE id=?', [auth.hashPassword(req.body.password), req.params.id]);
  }
  const [t] = await db.q('SELECT * FROM trainers WHERE id=?', [req.params.id]);
  res.json(trainerPublic(t));
}));

api.delete('/trainers/:id', requireAdmin, wrap(async (req, res) => {
  // I clienti restano: si stacca solo il collegamento al trainer.
  await db.q('UPDATE customers SET trainer_id=NULL WHERE trainer_id=?', [req.params.id]);
  // Stacca anche eventuali trainer sponsorizzati da questo.
  await db.q('UPDATE trainers SET sponsor_id=NULL WHERE sponsor_id=?', [req.params.id]);
  await db.q('DELETE FROM trainers WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// Approva un trainer in attesa (registrato via invito).
api.post('/trainers/:id/approve', requireAdmin, wrap(async (req, res) => {
  await db.q('UPDATE trainers SET active=1 WHERE id=?', [req.params.id]);
  res.json({ ok: true });
}));

// Imposta il tasso forzato (10/5/0) o lo rimette in automatico (null).
api.put('/trainers/:id/commission', requireAdmin, wrap(async (req, res) => {
  let ov = req.body.override;
  ov = (ov === null || ov === '' || ov === 'auto' || ov === undefined) ? null : Number(ov);
  if (ov !== null && ![0, 5, 10].includes(ov)) return res.status(400).json({ error: 'Tasso non valido.' });
  await db.q('UPDATE trainers SET commission_override=? WHERE id=?', [ov, req.params.id]);
  res.json({ ok: true });
}));

// Sospensione e sblocco clienti (controlli amministratore).
api.put('/trainers/:id/flags', requireAdmin, wrap(async (req, res) => {
  const sets = [];
  const params = [];
  if ('suspended' in req.body) { sets.push('suspended=?'); params.push(req.body.suspended ? 1 : 0); }
  if ('clients_unlocked' in req.body) { sets.push('clients_unlocked=?'); params.push(req.body.clients_unlocked ? 1 : 0); }
  if (!sets.length) return res.json({ ok: true });
  params.push(req.params.id);
  await db.q(`UPDATE trainers SET ${sets.join(', ')} WHERE id=?`, params);
  res.json({ ok: true });
}));

// L'amministratore attiva/disattiva un modulo extra per un coach.
api.put('/trainers/:id/modules', requireAdmin, wrap(async (req, res) => {
  const key = String(req.body.key || '').trim();
  if (!MODULE_KEYS.includes(key)) return res.status(400).json({ error: 'Modulo sconosciuto.' });
  const [t] = await db.q('SELECT modules FROM trainers WHERE id=?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Coach non trovato.' });
  const mods = parseModules(t.modules);
  mods[key] = !!req.body.enabled;
  await db.q('UPDATE trainers SET modules=? WHERE id=?', [JSON.stringify(mods), req.params.id]);
  const [full] = await db.q('SELECT * FROM trainers WHERE id=?', [req.params.id]);
  res.json(trainerPublic(full));
}));

// Riepilogo compensi di tutti i trainer attivi (per l'amministratore).
api.get('/billing', requireAdmin, wrap(async (_req, res) => {
  const trainers = await db.q('SELECT * FROM trainers WHERE active=1 ORDER BY last_name, first_name');
  const out = [];
  for (const t of trainers) {
    const b = await trainerBilling(t);
    out.push({ id: t.id, first_name: t.first_name, last_name: t.last_name, commission_override: t.commission_override, ...b });
  }
  res.json(out);
}));

// Stato del trainer corrente: codice invito, tasso e compensi maturati.
api.get('/me', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.json({ role: 'admin' });
  const [t] = await db.q('SELECT * FROM trainers WHERE id=?', [req.ctx.trainerId]);
  if (!t.invite_code) {
    const code = auth.randomToken(8);
    await db.q('UPDATE trainers SET invite_code=? WHERE id=?', [code, t.id]);
    t.invite_code = code;
  }
  const b = await trainerBilling(t);
  res.json({ role: 'trainer', id: t.id, first_name: t.first_name, last_name: t.last_name, invite_code: t.invite_code, ...b });
}));

// Il trainer aggiorna il proprio aspetto (logo + tema della console e dei clienti).
api.put('/me/branding', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.status(400).json({ error: 'Solo i trainer hanno un aspetto personalizzato.' });
  const data = pick(req.body, ['logo', 'theme_accent', 'theme_mode', 'theme_bg', 'theme_surface', 'brand_name', 'welcome_message']);
  data.id = req.ctx.trainerId;
  await db.q(
    `UPDATE trainers SET logo=:logo, theme_accent=:theme_accent, theme_mode=:theme_mode,
            theme_bg=:theme_bg, theme_surface=:theme_surface,
            brand_name=:brand_name, welcome_message=:welcome_message WHERE id=:id`,
    data
  );
  const [t] = await db.q('SELECT * FROM trainers WHERE id=?', [req.ctx.trainerId]);
  res.json(trainerPublic(t));
}));

// Il trainer attiva/disattiva la sezione nutrizione (default: disattivata).
// Vale per la sua console e per l'app di TUTTI i suoi clienti.
api.put('/me/settings', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.status(400).json({ error: 'Solo i trainer hanno impostazioni personali.' });
  const sets = [];
  const params = [];
  if ('nutrition_enabled' in req.body) { sets.push('nutrition_enabled=?'); params.push(req.body.nutrition_enabled ? 1 : 0); }
  if ('team_enabled' in req.body) { sets.push('team_enabled=?'); params.push(req.body.team_enabled ? 1 : 0); }
  if (sets.length) {
    params.push(req.ctx.trainerId);
    await db.q(`UPDATE trainers SET ${sets.join(', ')} WHERE id=?`, params);
  }
  const [t] = await db.q('SELECT * FROM trainers WHERE id=?', [req.ctx.trainerId]);
  res.json(trainerPublic(t));
}));

// ---- Rubrica del coach (collaboratori visibili ai clienti) ----------------
function contactBody(b) {
  return {
    name: (b.name || '').trim(),
    role: (b.role || '').trim() || null,
    phone: (b.phone || '').trim() || null,
    email: (b.email || '').trim() || null,
    notes: (b.notes || '').trim() || null,
  };
}

api.get('/me/contacts', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.json([]);
  res.json(await db.q('SELECT * FROM team_contacts WHERE trainer_id=? ORDER BY position, id', [req.ctx.trainerId]));
}));

api.post('/me/contacts', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.status(400).json({ error: 'Solo i coach hanno una rubrica.' });
  const c = contactBody(req.body);
  if (!c.name) return res.status(400).json({ error: 'Il nome è obbligatorio.' });
  const [{ n }] = await db.q('SELECT COALESCE(MAX(position),-1)+1 AS n FROM team_contacts WHERE trainer_id=?', [req.ctx.trainerId]);
  const r = await db.q(
    'INSERT INTO team_contacts (trainer_id, name, role, phone, email, notes, position) VALUES (?,?,?,?,?,?,?)',
    [req.ctx.trainerId, c.name, c.role, c.phone, c.email, c.notes, n]
  );
  const [row] = await db.q('SELECT * FROM team_contacts WHERE id=?', [r.insertId]);
  res.status(201).json(row);
}));

api.put('/me/contacts/:id', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.status(400).json({ error: 'Solo i coach hanno una rubrica.' });
  const c = contactBody(req.body);
  if (!c.name) return res.status(400).json({ error: 'Il nome è obbligatorio.' });
  const r = await db.q(
    'UPDATE team_contacts SET name=?, role=?, phone=?, email=?, notes=? WHERE id=? AND trainer_id=?',
    [c.name, c.role, c.phone, c.email, c.notes, req.params.id, req.ctx.trainerId]
  );
  if (!r.affectedRows) return res.status(404).json({ error: 'Contatto non trovato.' });
  const [row] = await db.q('SELECT * FROM team_contacts WHERE id=?', [req.params.id]);
  res.json(row);
}));

api.delete('/me/contacts/:id', requireStaff, wrap(async (req, res) => {
  if (req.ctx.role !== 'trainer') return res.status(400).json({ error: 'Solo i coach hanno una rubrica.' });
  await db.q('DELETE FROM team_contacts WHERE id=? AND trainer_id=?', [req.params.id, req.ctx.trainerId]);
  res.status(204).end();
}));

// ---- Accesso cliente via token (link PWA personale) ----------------------
// Dati del cliente esposti alla SUA app: esclude i campi gestionali del coach
// (compensi, pagamenti, note interne) per minimizzazione dei dati (GDPR).
function customerForClient(c) {
  return {
    id: c.id, first_name: c.first_name, last_name: c.last_name,
    email: c.email, phone: c.phone, birth_date: c.birth_date, birth_place: c.birth_place,
    gender: c.gender, address: c.address, address_cap: c.address_cap, address_city: c.address_city,
    address_province: c.address_province, address_country: c.address_country,
    height_cm: c.height_cm, weight_kg: c.weight_kg,
    fat_mass_pct: c.fat_mass_pct, lean_mass_kg: c.lean_mass_kg, waist_cm: c.waist_cm, goal: c.goal,
    subscription: c.subscription, subscription_expiry: c.subscription_expiry,
    trainer_id: c.trainer_id, privacy_accepted_at: c.privacy_accepted_at,
    privacy_guardian: c.privacy_guardian, deletion_requested_at: c.deletion_requested_at,
    team_visible: c.team_visible,
  };
}

api.get('/client/:token', wrap(async (req, res) => {
  const [c] = await db.q('SELECT * FROM customers WHERE access_token=?', [req.params.token]);
  if (!c) return res.status(404).json({ error: 'Link non valido o scaduto.' });
  let trainer = null;
  let contacts = [];
  let team = [];
  if (c.trainer_id) {
    const [t] = await db.q(
      `SELECT first_name, last_name, email, phone, bio, photo, logo,
              theme_accent, theme_mode, theme_bg, theme_surface, nutrition_enabled, team_enabled,
              brand_name, welcome_message
       FROM trainers WHERE id=?`,
      [c.trainer_id]
    );
    trainer = t || null;
    contacts = await db.q(
      'SELECT id, name, role, phone, email, notes FROM team_contacts WHERE trainer_id=? ORDER BY position, id',
      [c.trainer_id]
    );
    // Compagni di team: solo se il coach ha abilitato la sezione. Altri clienti
    // dello stesso coach che hanno scelto di essere visibili (solo nome e cognome).
    if (trainer && Number(trainer.team_enabled)) {
      team = await db.q(
        'SELECT first_name, last_name FROM customers WHERE trainer_id=? AND team_visible=1 AND id<>? ORDER BY first_name, last_name',
        [c.trainer_id, c.id]
      );
    }
  }
  res.json({ customer: customerForClient(c), trainer, contacts, team });
}));

// Il cliente sceglie se comparire nel "Team" (visibile agli altri clienti del coach).
api.post('/client/team-visibility', requireClientOrStaff, wrap(async (req, res) => {
  if (!requireClientRole(req, res)) return;
  const visible = req.body.visible ? 1 : 0;
  await db.q('UPDATE customers SET team_visible=? WHERE id=?', [visible, req.ctx.customerId]);
  res.json({ team_visible: visible });
}));

// Solo il cliente autenticato (token) puo' agire sui propri dati privacy.
function requireClientRole(req, res) {
  if (req.ctx && req.ctx.role === 'client') return true;
  res.status(400).json({ error: 'Azione riservata al cliente.' });
  return false;
}

// Il cliente accetta l'informativa privacy (consenso GDPR).
// Se minorenne, registra anche il nome del genitore/tutore.
api.post('/client/privacy-accept', requireClientOrStaff, wrap(async (req, res) => {
  if (!requireClientRole(req, res)) return;
  const guardian = (req.body.guardian || '').trim() || null;
  await db.q('UPDATE customers SET privacy_accepted_at=NOW(), privacy_guardian=? WHERE id=?', [guardian, req.ctx.customerId]);
  const [c] = await db.q('SELECT privacy_accepted_at, privacy_guardian FROM customers WHERE id=?', [req.ctx.customerId]);
  res.json({ privacy_accepted_at: c ? c.privacy_accepted_at : null, privacy_guardian: c ? c.privacy_guardian : null });
}));

// Il cliente revoca il consenso: il trattamento si interrompe e l'app richiede
// di nuovo il consenso al prossimo accesso.
api.post('/client/privacy-revoke', requireClientOrStaff, wrap(async (req, res) => {
  if (!requireClientRole(req, res)) return;
  await db.q('UPDATE customers SET privacy_accepted_at=NULL WHERE id=?', [req.ctx.customerId]);
  res.json({ ok: true });
}));

// Diritto di accesso/portabilita' (artt. 15, 20): il cliente scarica i propri dati.
// Path senza ":token" per non essere intercettata dalla rotta GET /client/:token.
api.get('/client-export', requireClientOrStaff, wrap(async (req, res) => {
  if (!requireClientRole(req, res)) return;
  const id = req.ctx.customerId;
  const [c] = await db.q('SELECT * FROM customers WHERE id=?', [id]);
  const profile = customerForClient(c);
  const plans = await db.q('SELECT id, name, duration_weeks, status, start_date, end_date FROM plans WHERE customer_id=?', [id]);
  const logs = await db.q(
    `SELECT l.plan_id, l.exercise_id, l.week_number, l.series_index, l.actual_weight, l.completed, l.logged_at
     FROM exercise_logs l JOIN plans p ON p.id=l.plan_id WHERE p.customer_id=?`, [id]
  );
  const updates = await db.q(
    `SELECT u.plan_id, u.week_number, u.percent_complete, u.note, u.sent_at
     FROM weekly_updates u JOIN plans p ON p.id=u.plan_id WHERE p.customer_id=?`, [id]
  );
  const photos = await db.q('SELECT id, plan_id, photo_type, taken_at FROM progress_photos WHERE customer_id=?', [id]);
  res.json({
    exported_at: new Date().toISOString(),
    note: 'Dati personali relativi al tuo profilo MyTeam. Le immagini delle foto non sono incluse: puoi scaricarle dalla sezione Progressi.',
    profile, plans, exercise_logs: logs, weekly_updates: updates, progress_photos: photos,
  });
}));

// Diritto all'oblio (art. 17): il cliente richiede la cancellazione dei dati.
// Non cancella subito: registra la richiesta e avvisa il coach, che la gestisce.
api.post('/client/request-deletion', requireClientOrStaff, wrap(async (req, res) => {
  if (!requireClientRole(req, res)) return;
  const id = req.ctx.customerId;
  await db.q('UPDATE customers SET deletion_requested_at=NOW() WHERE id=?', [id]);
  const [c] = await db.q('SELECT first_name, last_name, trainer_id FROM customers WHERE id=?', [id]);
  if (c) {
    const msg = `${c.first_name} ${c.last_name} ha richiesto la cancellazione dei propri dati (diritto all'oblio).`;
    await db.q('INSERT INTO notifications (type, audience, customer_id, message) VALUES (?,?,?,?)',
      ['deletion_request', 'admin', id, msg]);
    if (c.trainer_id) sendPush('coach', c.trainer_id, { title: 'MyTeam — richiesta cancellazione', body: msg, url: '/' }).catch(() => {});
  }
  res.json({ ok: true });
}));

app.use('/api', api);

// ---- Frontend statico -----------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Avvio ----------------------------------------------------------------
(async () => {
  try {
    await db.init();
    await seedCatalog(db); // catalogo esercizi sempre disponibile per l'autocomplete
    await normalizeCatalog(db); // nomi a Title Case + rimozione duplicati (idempotente)
    if (String(process.env.SEED_DEMO).toLowerCase() === 'true') {
      await seedDemo(db);
    }
    // Ascolta su tutte le interfacce del CONTAINER; l'esposizione verso l'host
    // e' limitata a 127.0.0.1 da docker-compose (niente rete aziendale).
    app.listen(PORT, () => console.log(`[app] in ascolto sulla porta ${PORT}`));
  } catch (err) {
    console.error('[app] avvio fallito:', err);
    process.exit(1);
  }
})();
