# MIGRAZIONE — Spostare MyTeam su un altro computer

Promemoria per riprendere il progetto **MyTeam** (app gestione team) su un nuovo PC.
Quasi tutto vive già nel cloud: non serve spostare file, basta accedere agli account
e reinstallare gli strumenti. **Il sito resta online anche a PC spento.**

## Dove vive il progetto

| Posto | Cosa contiene | Legato al PC? |
|---|---|---|
| **GitHub** (`DevLucaMariani/MyTeam`) | tutto il codice | No, è online |
| **Railway** | server online + **database** (clienti, coach, schede) + **segreti** (chiavi VAPID, password) | No, gira da solo |
| **Il tuo PC** | solo una *copia di lavoro* del codice | Sì, ma non contiene niente di unico |

Del vecchio computer **non devi salvare nulla**: è solo una copia di ciò che è già su GitHub.

## Account da saper usare (segnali nel gestore password)

- **Login GitHub** (utente `DevLucaMariani` + password + eventuale 2FA)
- **Login Railway**
- **Password admin dell'app** (variabile `ADMIN_PASSWORD`, salvata su Railway)

## Programmi da installare sul nuovo PC (gratuiti)

- **Git** — per scaricare/caricare il codice
- **Node.js**
- **Docker Desktop** — *solo se* vuoi provare le modifiche in locale (`Avvia.bat`)
- *(facoltativi)* VS Code (editor) e Claude Code

## Passi una volta installato tutto

```bash
git clone https://github.com/DevLucaMariani/MyTeam.git
cd MyTeam/backend
npm install
```

Al primo `git push` GitHub chiede l'accesso dal browser: accedi con l'account
`DevLucaMariani`. (`node_modules` non è su GitHub: lo riscarica `npm install`.)

## I segreti (parte delicata)

I file `.env` con i segreti **non** sono su GitHub (giusto così).

- **Per il sito online non servono sul PC**: stanno dentro Railway (sezione *Variables*) e ci restano.
- **Le variabili del database** (`MYSQL...`) le crea Railway da solo col plugin MySQL: niente da ricreare.
- ⚠️ **Chiavi VAPID delle notifiche** (`VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`):
  se le rigeneri per sbaglio, le notifiche smettono di funzionare sui telefoni già iscritti.
  **Copiale dalle Variables di Railway e conservale nel gestore password.**

## Backup consigliato (5 minuti, da fare comunque)

1. Annota in un posto sicuro le variabili Railway: `ADMIN_PASSWORD`, `VAPID_PUBLIC`,
   `VAPID_PRIVATE`, `VAPID_SUBJECT`.
2. Esporta ogni tanto un **dump del database MySQL** da Railway, così non perdi clienti
   e schede se cancelli per sbaglio il progetto.

## In sintesi

Non devi portarti dietro file. Basta: **accedere a GitHub e Railway**, installare
**Git + Node** (+ Docker se sviluppi in locale) e fare **`git clone`**.
Sito, database e segreti sono già al sicuro nel cloud.
