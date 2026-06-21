# Client Configurator — Piattaforma di gestione palestra

SPA per la gestione di clienti, schede di allenamento, piano nutrizionale e
monitoraggio progressi. Due ruoli: **Amministratore** (pannello web) e
**Cliente** (PWA installabile su smartphone).

**Tutto gira in locale su questo PC.** Lo stack è composto da:

- **MariaDB** (database) in un container Docker
- **Backend Node/Express** che espone le API e serve il frontend
- **Frontend** in JavaScript vanilla (nessun build step)

> 🔒 **Privacy / rete aziendale:** tutte le porte sono pubblicate solo su
> `127.0.0.1` (localhost). Nessun servizio è raggiungibile dalla rete aziendale.

## Avvio (modo semplice)

1. Avvia **Docker Desktop**.
2. Doppio clic su **`Avvia.bat`** → si apre `http://localhost:8137`.
3. Per fermare: doppio clic su **`Ferma.bat`**.

## Avvio (da terminale)

```bash
docker compose up -d --build     # avvia (scarica le immagini la prima volta)
docker compose logs -f app       # log dell'applicazione
docker compose down              # ferma (i dati restano nel volume)
docker compose down -v           # ferma ED ELIMINA i dati del database
```

## Architettura

```
Browser ──HTTP──▶ http://localhost:8137  (container "app": Express + frontend)
                                │
                                └──TCP──▶ container "db": MariaDB  (127.0.0.1:3307)
```

| Componente | Porta host (solo localhost) | Note |
|------------|-----------------------------|------|
| Applicazione web | `127.0.0.1:8137` | interfaccia admin + PWA cliente |
| MariaDB | `127.0.0.1:3307` | accesso opzionale con un client SQL |

Credenziali e nome database sono nel file **`.env`** (modificabili).

## Struttura del progetto

```
Client Configurator/
├─ docker-compose.yml      stack locale (db + app), porte su 127.0.0.1
├─ .env                    configurazione (nome DB, credenziali, dati demo)
├─ Avvia.bat / Ferma.bat   avvio/stop con doppio clic
├─ backend/
│  ├─ Dockerfile           immagine Node che serve API + frontend
│  ├─ server.js            API REST (clienti, schede, log, foto…)
│  ├─ db.js                pool MariaDB + attesa + schema automatico
│  ├─ schema.sql           schema relazionale (idempotente)
│  └─ seed.js              dati dimostrativi al primo avvio
└─ frontend/
   ├─ index.html           SPA
   ├─ manifest.json, sw.js  PWA installabile
   ├─ css/styles.css
   └─ js/                   api, ui, admin, client, router, app
```

## Funzionalità (dal diagramma di flusso)

**Amministratore**
- Anagrafica clienti (dati personali, fisici, commerciali)
- Creazione scheda: durata 8/12 settimane, giorni, esercizi (serie, ripetizioni,
  peso suggerito, recupero, note)
- Piano nutrizionale (calorie, proteine, carboidrati, grassi, acqua;
  giorni di allenamento vs riposo)
- Stato scheda bozza → attiva
- Monitoraggio: pesi usati, completamento, aggiornamenti settimanali, foto
- Modifica scheda attiva → nuova **versione** registrata
- **Duplicazione** scheda (stesso o altro cliente; copia struttura e nutrizione,
  non i progressi)

**Cliente (PWA)**
- Dashboard con completamento settimanale
- Consultazione scheda attiva e piano nutrizionale
- Compilazione esercizi: peso effettivo + spunta completato (salvataggio automatico)
- Invio aggiornamento settimanale (percentuale di completamento)
- Caricamento foto di monitoraggio (fronte, lato, retro, libera)
- Storico progressi

## Dati e persistenza

I dati vivono nel volume Docker `db_data` (MariaDB). Sopravvivono a riavvii e
spegnimenti. `docker compose down -v` cancella tutto (utile per ripartire puliti).
