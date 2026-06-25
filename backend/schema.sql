-- Schema relazionale di Client Configurator (MariaDB).
-- Idempotente: eseguibile piu' volte senza errori (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80)  NOT NULL,
  last_name     VARCHAR(80)  NOT NULL,
  email         VARCHAR(160),
  phone         VARCHAR(40),
  birth_date    DATE,
  gender        VARCHAR(20),
  height_cm     DECIMAL(5,1),
  weight_kg     DECIMAL(5,1),
  goal          VARCHAR(255),
  subscription  VARCHAR(80),
  subscription_expiry DATE,
  -- Dati di abbonamento / pagamento
  fee_amount    DECIMAL(10,2),
  paid          TINYINT(1) NOT NULL DEFAULT 0,
  paid_date     DATE,
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paid TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS paid_date DATE;

-- Ruolo "trainer" (istruttore): ogni trainer ha una propria console e vede solo
-- i propri clienti. Le credenziali sono create dall'amministratore.
CREATE TABLE IF NOT EXISTS trainers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(80) NOT NULL,
  last_name     VARCHAR(80) NOT NULL,
  email         VARCHAR(160),
  phone         VARCHAR(40),
  bio           TEXT,
  -- Foto del trainer come data URL base64 (mostrata al cliente).
  photo         LONGTEXT,
  username      VARCHAR(80) NOT NULL,
  -- Password salata+hash (mai in chiaro); vedi backend/auth.js.
  password_hash VARCHAR(255) NOT NULL,
  -- Token segreto della console del trainer (usato come "sessione" lato client).
  console_token VARCHAR(64) NOT NULL,
  active        TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_trainer_username (username),
  UNIQUE KEY uq_trainer_token (console_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Personalizzazione (white-label) del trainer: logo e tema applicati alla sua
-- console e all'app dei suoi clienti.
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS logo LONGTEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS theme_accent VARCHAR(20);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(10);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS theme_bg VARCHAR(20);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS theme_surface VARCHAR(20);

-- Sponsorizzazioni e compensi.
-- sponsor_id: trainer che ha sponsorizzato questo trainer (NULL se creato dall'admin).
-- invite_code: codice/link invito personale del trainer.
-- commission_override: tasso forzato dall'admin (10/5/0); NULL = automatico.
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS sponsor_id INT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS invite_code VARCHAR(40);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS commission_override TINYINT;
ALTER TABLE trainers ADD UNIQUE INDEX uq_trainer_invite (invite_code);
-- Controlli amministratore: sospensione (accede ma non opera) e sblocco clienti
-- oltre il limite gratuito di 2.
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS suspended TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS clients_unlocked TINYINT(1) NOT NULL DEFAULT 0;
-- Presenza online: ultimo accesso (aggiornato a ogni richiesta / heartbeat).
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL DEFAULT NULL;
-- Sezione nutrizione: DISATTIVATA di default. Il coach la abilita a propria
-- discrezione/responsabilita' (in Italia la dieta e' riservata a professionisti
-- abilitati). Se 0, la sezione e' nascosta sia al coach sia ai suoi clienti.
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS nutrition_enabled TINYINT(1) NOT NULL DEFAULT 0;
-- White-label esteso: nome dello studio/brand e messaggio di benvenuto mostrati
-- ai clienti del coach (oltre a logo e tema gia' presenti).
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS brand_name VARCHAR(80);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS welcome_message VARCHAR(200);

-- Collega ogni cliente al proprio trainer e dagli un token personale per il
-- link PWA (link permanente: si invia una volta, i contenuti si aggiornano).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS trainer_id INT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS access_token VARCHAR(64);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE customers ADD UNIQUE INDEX uq_customer_token (access_token);
-- Consenso privacy (GDPR): data/ora in cui il cliente ha accettato l'informativa
-- sul trattamento dei dati (inclusi dati particolari: peso, foto di monitoraggio).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP NULL DEFAULT NULL;
-- Se il cliente e' minorenne, nome del genitore/tutore che presta il consenso.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS privacy_guardian VARCHAR(120);
-- Richiesta di cancellazione dati inviata dal cliente (diritto all'oblio, art. 17).
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS plans (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  customer_id    INT NOT NULL,
  name           VARCHAR(160) NOT NULL,
  duration_weeks INT NOT NULL DEFAULT 8,
  status         ENUM('bozza','attiva','archiviata') NOT NULL DEFAULT 'bozza',
  version        INT NOT NULL DEFAULT 1,
  start_date     DATE,
  end_date       DATE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE plans ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS end_date DATE;
-- Prezzo della scheda (inserito dal trainer): base di calcolo dei compensi.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- Catalogo esercizi: elenco riusabile da cui l'amministratore puo' scegliere
-- (oppure scrivere liberamente un nome non in elenco).
CREATE TABLE IF NOT EXISTS exercise_catalog (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(160) NOT NULL,
  muscle_group   VARCHAR(80),
  default_series INT,
  -- Ripetizioni di default per serie (JSON), es. ["12","10","8"].
  default_reps   LONGTEXT,
  -- Intensita' di default per serie (JSON), es. ["@8","@8","@9"].
  default_intensity LONGTEXT,
  UNIQUE KEY uq_catalog_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Aggiornamento idempotente per installazioni gia' esistenti.
ALTER TABLE exercise_catalog ADD COLUMN IF NOT EXISTS default_series INT;
ALTER TABLE exercise_catalog ADD COLUMN IF NOT EXISTS default_reps LONGTEXT;
ALTER TABLE exercise_catalog ADD COLUMN IF NOT EXISTS default_intensity LONGTEXT;
-- Media dimostrativo dell'esercizio: link a immagine/GIF/YouTube (mostrato al cliente).
ALTER TABLE exercise_catalog ADD COLUMN IF NOT EXISTS media_url VARCHAR(2048);

-- Struttura settimanale "modello": giorni di allenamento del piano.
CREATE TABLE IF NOT EXISTS plan_days (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  plan_id   INT NOT NULL,
  position  INT NOT NULL DEFAULT 0,
  name      VARCHAR(120) NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS plan_exercises (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  day_id           INT NOT NULL,
  position         INT NOT NULL DEFAULT 0,
  name             VARCHAR(160) NOT NULL,
  num_series       INT NOT NULL DEFAULT 3,
  suggested_weight VARCHAR(40),
  rest             VARCHAR(40),
  notes            VARCHAR(255),
  -- Schema ripetizioni (JSON): { "default": ["12","10","8"], "overrides": { "3": ["10","8","6"] } }
  -- default = ripetizioni per serie valide per tutte le settimane;
  -- overrides[settimana] = ripetizioni per serie specifiche di quella settimana.
  reps_scheme      LONGTEXT,
  -- Schema intensita' per serie (stesso formato di reps_scheme), es. "@8", "RPE 8", "80%".
  intensity_scheme LONGTEXT,
  FOREIGN KEY (day_id) REFERENCES plan_days(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE plan_exercises ADD COLUMN IF NOT EXISTS intensity_scheme LONGTEXT;
-- Codice superset: esercizi con lo stesso codice (nello stesso giorno) si
-- eseguono insieme come superset. Vuoto/NULL = esercizio singolo.
ALTER TABLE plan_exercises ADD COLUMN IF NOT EXISTS superset_group VARCHAR(8);
-- Esercizio monolaterale (unilaterale): si esegue un lato alla volta.
-- Il cliente vede l'indicazione "per lato".
ALTER TABLE plan_exercises ADD COLUMN IF NOT EXISTS unilateral TINYINT(1) NOT NULL DEFAULT 0;

-- Piano nutrizionale: una riga per tipo di giorno (allenamento / riposo).
CREATE TABLE IF NOT EXISTS nutrition (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  plan_id   INT NOT NULL,
  day_type  ENUM('allenamento','riposo') NOT NULL,
  calories  INT,
  protein_g INT,
  carbs_g   INT,
  fat_g     INT,
  water_l   DECIMAL(3,1),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  UNIQUE KEY uq_nutrition (plan_id, day_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Storico versioni del piano (generato quando si modifica un piano attivo).
CREATE TABLE IF NOT EXISTS plan_versions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  plan_id    INT NOT NULL,
  version    INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(80) DEFAULT 'amministratore',
  note       VARCHAR(255),
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Compilazione del cliente: peso reale e completamento PER SERIE / settimana.
CREATE TABLE IF NOT EXISTS exercise_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  plan_id       INT NOT NULL,
  exercise_id   INT NOT NULL,
  week_number   INT NOT NULL,
  series_index  INT NOT NULL DEFAULT 1,
  actual_weight VARCHAR(40),
  completed     TINYINT(1) NOT NULL DEFAULT 0,
  logged_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES plan_exercises(id) ON DELETE CASCADE,
  UNIQUE KEY uq_log (exercise_id, week_number, series_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Aggiornamento settimanale inviato dal cliente.
CREATE TABLE IF NOT EXISTS weekly_updates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  plan_id         INT NOT NULL,
  week_number     INT NOT NULL,
  exercises_done  INT NOT NULL DEFAULT 0,
  total_exercises INT NOT NULL DEFAULT 0,
  percent_complete INT NOT NULL DEFAULT 0,
  note            VARCHAR(500),
  sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifiche: audience='admin' (es. aggiornamento ricevuto) o 'client' (nuova scheda).
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        VARCHAR(40) NOT NULL DEFAULT 'weekly_update',
  audience    VARCHAR(20) NOT NULL DEFAULT 'admin',
  customer_id INT,
  plan_id     INT,
  week_number INT,
  message     VARCHAR(400) NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'admin';

-- Foto di monitoraggio (immagine salvata come data URL base64).
CREATE TABLE IF NOT EXISTS progress_photos (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  plan_id    INT NOT NULL,
  customer_id INT NOT NULL,
  photo_type ENUM('fronte','lato','retro','libera') NOT NULL,
  image_data LONGTEXT NOT NULL,
  taken_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rubrica del coach: collaboratori/professionisti (nutrizionista, osteopata,
-- fisioterapista...) che il coach collega al proprio team. Visibili ai suoi clienti.
CREATE TABLE IF NOT EXISTS team_contacts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id  INT NOT NULL,
  name        VARCHAR(120) NOT NULL,
  role        VARCHAR(120),
  phone       VARCHAR(40),
  email       VARCHAR(160),
  notes       VARCHAR(255),
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sottoscrizioni alle notifiche push (Web Push). audience: 'coach' | 'client'.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  audience      VARCHAR(20) NOT NULL,
  owner_id      INT NOT NULL,
  endpoint      TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,
  p256dh        VARCHAR(255) NOT NULL,
  auth          VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_hash (endpoint_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
