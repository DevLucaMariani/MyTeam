/* eslint-env node */
'use strict';

// Import "best-effort" di una scheda da PDF: estrae il testo con pdftotext
// (-layout) e prova a riconoscere giorni, esercizi e schemi settimanali.
// Il risultato e' una BOZZA da controllare: i PDF sono molto irregolari.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const MESI = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};

const tokenize = (l) => l.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean);
const isAllCapsName = (t) => /[A-ZÀ-Ù]/.test(t) && t === t.toUpperCase()
  && /^[A-ZÀ-Ù0-9"().+/ -]{2,}$/.test(t) && !/^\d+$/.test(t);
const isScheme = (t) => /\d/.test(t) && /[x×@%/]/i.test(t);
const isLoneNumber = (t) => /^\d{1,2}$/.test(t);

// Parsa uno schema settimanale tipo "2x10 1x8" -> ['10','10','8']; "3x12/12" -> ['12/12',...]
function parseScheme(s) {
  const reps = [];
  const groups = String(s).replace(/\+/g, ' ').split(/\s+/).filter(Boolean);
  groups.forEach((g) => {
    const m = g.match(/(\d+)\s*[x×]\s*([\dmax/]+)/i);
    if (m) {
      const sets = Math.min(12, parseInt(m[1], 10) || 1);
      for (let i = 0; i < sets; i += 1) reps.push(m[2]);
    }
  });
  return reps;
}

function parseDates(text) {
  const line = (text.split(/\r?\n/).find((l) => /INIZIO PROGRAMMA/i.test(l)) || '');
  const re = /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/gi;
  const found = [];
  let m;
  while ((m = re.exec(line)) !== null) found.push({ d: parseInt(m[1], 10), mo: MESI[m[2].toLowerCase()] });
  if (!found.length) return { start_date: null, end_date: null };
  const year = new Date().getFullYear();
  const fmt = (x, y) => `${y}-${String(x.mo).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;
  const start = fmt(found[0], year);
  let end = null;
  if (found[1]) {
    let ey = year;
    if (found[1].mo < found[0].mo) ey += 1; // fine va all'anno dopo
    end = fmt(found[1], ey);
  }
  return { start_date: start, end_date: end };
}

// Parsa il testo (gia' estratto con -layout) in una bozza di scheda.
function parseProgram(text) {
  const lines = text.split(/\r?\n/);
  const days = [];
  let day = { name: 'Giorno 1', exercises: [] };
  let cur = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    const toks = tokenize(line);
    if (toks.length === 1 && isLoneNumber(toks[0])) { // separatore di pagina/giorno
      if (day.exercises.length) days.push(day);
      day = { name: 'Giorno ' + (days.length + 1), exercises: [] };
      cur = null;
      continue;
    }
    if (/INIZIO PROGRAMMA|ESERCIZI/i.test(line)) continue;

    if (isAllCapsName(toks[0])) {
      cur = { name: toks[0], note: [], schemes: [] };
      day.exercises.push(cur);
      for (let i = 1; i < toks.length; i += 1) {
        if (isScheme(toks[i])) cur.schemes.push(toks[i]);
        else cur.note.push(toks[i]);
      }
    } else if (cur) {
      for (const t of toks) {
        if (isScheme(t)) cur.schemes.push(t);
        else if (!isLoneNumber(t)) cur.note.push(t);
      }
    }
  }
  if (day.exercises.length) days.push(day);

  // Accorpa i frammenti senza schemi (note su piu' righe) all'esercizio precedente.
  days.forEach((d) => {
    const cleaned = [];
    d.exercises.forEach((e) => {
      if (e.schemes.length === 0 && cleaned.length) {
        cleaned[cleaned.length - 1].note.push(e.name, ...e.note);
      } else cleaned.push(e);
    });
    d.exercises = cleaned;
  });

  // Numero di settimane: dalla riga di intestazione (es. "... 1 2 3 4 5 6 7 8").
  let weeks = 0;
  const headerLine = lines.find((l) => /ESERCIZI/i.test(l));
  if (headerLine) weeks = tokenize(headerLine).filter((t) => isLoneNumber(t)).length;

  const outDays = days.map((d) => ({
    name: d.name,
    exercises: d.exercises.map((e) => {
      const reps = parseScheme(e.schemes[0] || '');
      const numSeries = reps.length || 3;
      const noteParts = [];
      const note = e.note.join(' ').trim();
      if (note) noteParts.push(note);
      if (e.schemes.length) noteParts.push('Schemi PDF (sett.): ' + e.schemes.join(' | '));
      return {
        name: e.name,
        num_series: numSeries,
        suggested_weight: '',
        rest: '',
        notes: noteParts.join(' — '),
        reps_scheme: { default: reps.length ? reps : Array(numSeries).fill(''), overrides: {} },
        intensity_scheme: { default: Array(numSeries).fill(''), overrides: {} },
      };
    }),
  }));

  const dates = parseDates(text);
  return {
    name: '',
    duration_weeks: Math.min(52, Math.max(1, weeks || 8)),
    start_date: dates.start_date || '',
    end_date: dates.end_date || '',
    days: outDays.filter((d) => d.exercises.length),
  };
}

// Estrae il testo da un PDF (buffer) usando pdftotext -layout.
function extractText(buffer) {
  return new Promise((resolve, reject) => {
    const base = path.join(os.tmpdir(), 'pwin-' + crypto.randomBytes(8).toString('hex'));
    const pdf = base + '.pdf';
    const txt = base + '.txt';
    fs.writeFile(pdf, buffer, (werr) => {
      if (werr) return reject(werr);
      execFile('pdftotext', ['-layout', pdf, txt], (eerr) => {
        if (eerr) { fs.unlink(pdf, () => {}); return reject(new Error('Impossibile leggere il PDF (pdftotext).')); }
        fs.readFile(txt, 'utf8', (rerr, data) => {
          fs.unlink(pdf, () => {});
          fs.unlink(txt, () => {});
          if (rerr) return reject(rerr);
          resolve(data);
        });
      });
    });
  });
}

async function importPdfBuffer(buffer) {
  const text = await extractText(buffer);
  return parseProgram(text);
}

module.exports = { parseProgram, extractText, importPdfBuffer };
