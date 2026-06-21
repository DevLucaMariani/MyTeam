/* eslint-env node */
'use strict';

// Costruisce lo schema ripetizioni: stesse ripetizioni per ogni serie e settimana.
function repsScheme(perSeries) {
  return JSON.stringify({ default: perSeries.map(String), overrides: {} });
}

// Popola dati dimostrativi SOLO se non ci sono clienti (primo avvio).
async function seedDemo(db) {
  const [{ n }] = await db.q('SELECT COUNT(*) AS n FROM customers');
  if (n > 0) {
    console.log("[seed] dati gia' presenti, salto il seeding.");
    return;
  }
  console.log('[seed] inserisco dati dimostrativi...');

  await db.tx(async (conn) => {
    const [c1] = await conn.query(
      `INSERT INTO customers (first_name,last_name,email,phone,birth_date,gender,height_cm,weight_kg,goal,subscription,subscription_expiry,notes)
       VALUES ('Marco','Rossi','marco.rossi@example.com','3331112222','1992-04-15','M',178,82.5,'Ipertrofia e forza','Annuale','2026-12-31','Nessuna patologia nota.')`
    );
    const cust1 = c1.insertId;

    await conn.query(
      `INSERT INTO customers (first_name,last_name,email,phone,birth_date,gender,height_cm,weight_kg,goal,subscription,subscription_expiry,notes)
       VALUES ('Giulia','Bianchi','giulia.bianchi@example.com','3334445555','1996-09-02','F',165,60.0,'Dimagrimento e tonificazione','Trimestrale','2026-09-30','Preferisce allenamenti al mattino.')`
    );

    const [p1] = await conn.query(
      'INSERT INTO plans (customer_id,name,duration_weeks,status,version) VALUES (?,?,?,?,1)',
      [cust1, 'Forza Base 8 settimane', 8, 'attiva']
    );
    const plan1 = p1.insertId;

    // Ogni esercizio: nome, num serie, ripetizioni per serie, peso suggerito, recupero, note.
    const days = [
      {
        name: 'Giorno A — Petto e Tricipiti',
        ex: [
          ['Panca piana bilanciere', 4, [10, 10, 8, 8], '60 kg', "90''", 'Schiena ben appoggiata'],
          ['Spinte manubri inclinata', 3, [12, 10, 10], '22 kg', "75''", ''],
          ['Croci ai cavi', 3, [15, 12, 12], '12 kg', "60''", ''],
          ['French press', 3, [12, 10, 10], '25 kg', "60''", ''],
        ],
      },
      {
        name: 'Giorno B — Dorso e Bicipiti',
        ex: [
          ['Trazioni alla sbarra', 4, [8, 6, 6, 6], 'corpo libero', "90''", 'Aiuto elastico se serve'],
          ['Rematore bilanciere', 4, [10, 8, 8, 8], '50 kg', "90''", ''],
          ['Lat machine presa stretta', 3, [12, 10, 10], '50 kg', "60''", ''],
          ['Curl bilanciere', 3, [12, 10, 10], '25 kg', "60''", ''],
        ],
      },
      {
        name: 'Giorno C — Gambe',
        ex: [
          ['Squat bilanciere', 4, [10, 8, 8, 6], '80 kg', "120''", 'Profondita controllata'],
          ['Pressa 45', 3, [12, 12, 10], '160 kg', "90''", ''],
          ['Leg curl', 3, [15, 12, 12], '40 kg', "60''", ''],
          ['Calf in piedi', 4, [20, 18, 15, 15], '60 kg', "45''", ''],
        ],
      },
    ];

    const firstExerciseIds = [];
    for (let i = 0; i < days.length; i += 1) {
      const [dr] = await conn.query(
        'INSERT INTO plan_days (plan_id,position,name) VALUES (?,?,?)',
        [plan1, i, days[i].name]
      );
      const dayId = dr.insertId;
      const exs = days[i].ex;
      for (let j = 0; j < exs.length; j += 1) {
        const [name, series, reps, w, rest, notes] = exs[j];
        const [er] = await conn.query(
          `INSERT INTO plan_exercises (day_id,position,name,num_series,suggested_weight,rest,notes,reps_scheme)
           VALUES (?,?,?,?,?,?,?,?)`,
          [dayId, j, name, series, w, rest, notes, repsScheme(reps)]
        );
        if (i === 0) firstExerciseIds.push({ id: er.insertId, series });
      }
    }

    await conn.query(
      `INSERT INTO nutrition (plan_id,day_type,calories,protein_g,carbs_g,fat_g,water_l) VALUES
       (?,'allenamento',2600,180,300,70,3.0),
       (?,'riposo',2300,170,230,70,2.5)`,
      [plan1, plan1]
    );

    // Log della settimana 1 sul primo giorno (per mostrare il monitoraggio).
    let total = 0; let done = 0;
    for (const ex of firstExerciseIds) {
      for (let s = 1; s <= ex.series; s += 1) {
        total += 1;
        const completed = (done < 5) ? 1 : 0; // qualche serie completata
        if (completed) done += 1;
        await conn.query(
          `INSERT INTO exercise_logs (plan_id,exercise_id,week_number,series_index,actual_weight,completed)
           VALUES (?,?,?,?,?,?)`,
          [plan1, ex.id, 1, s, `${50 + s * 2} kg`, completed]
        );
      }
    }

    // Totale serie dell'intero piano per la percentuale dell'aggiornamento.
    const [trows] = await conn.query(
      'SELECT COALESCE(SUM(num_series),0) AS tot FROM plan_exercises e JOIN plan_days d ON d.id=e.day_id WHERE d.plan_id=?',
      [plan1]
    );
    const totalSeries = Number(trows[0].tot);
    await conn.query(
      `INSERT INTO weekly_updates (plan_id,week_number,exercises_done,total_exercises,percent_complete,note)
       VALUES (?,?,?,?,?,?)`,
      [plan1, 1, done, totalSeries, totalSeries ? Math.round((done / totalSeries) * 100) : 0,
        'Prima settimana ok, buone sensazioni.']
    );
  });

  console.log('[seed] dati dimostrativi inseriti.');
}

// Catalogo esercizi comuni, popolato SOLO se la tabella e' vuota.
// Indipendente dai dati demo: serve l'autocomplete anche senza SEED_DEMO.
async function seedCatalog(db) {
  const [{ n }] = await db.q('SELECT COUNT(*) AS n FROM exercise_catalog');
  if (n > 0) return;
  const items = [
    ['Panca piana bilanciere', 'Petto'], ['Panca inclinata bilanciere', 'Petto'],
    ['Spinte manubri inclinata', 'Petto'], ['Croci ai cavi', 'Petto'], ['Croci manubri', 'Petto'],
    ['Dips alle parallele', 'Petto'], ['Chest press', 'Petto'],
    ['Trazioni alla sbarra', 'Dorso'], ['Lat machine avanti', 'Dorso'], ['Lat machine presa stretta', 'Dorso'],
    ['Rematore bilanciere', 'Dorso'], ['Rematore manubrio', 'Dorso'], ['Pulley basso', 'Dorso'],
    ['Stacco da terra', 'Dorso'],
    ['Military press', 'Spalle'], ['Lento avanti manubri', 'Spalle'], ['Alzate laterali', 'Spalle'],
    ['Alzate frontali', 'Spalle'], ['Alzate posteriori', 'Spalle'], ['Tirate al mento', 'Spalle'],
    ['Curl bilanciere', 'Bicipiti'], ['Curl manubri', 'Bicipiti'], ['Curl a martello', 'Bicipiti'],
    ['Curl ai cavi', 'Bicipiti'], ['Panca Scott', 'Bicipiti'],
    ['French press', 'Tricipiti'], ['Push down ai cavi', 'Tricipiti'], ['Estensioni sopra la testa', 'Tricipiti'],
    ['Dips tra panche', 'Tricipiti'],
    ['Squat bilanciere', 'Gambe'], ['Pressa 45', 'Gambe'], ['Affondi manubri', 'Gambe'],
    ['Leg extension', 'Gambe'], ['Leg curl', 'Gambe'], ['Stacco rumeno', 'Gambe'],
    ['Calf in piedi', 'Gambe'], ['Hip thrust', 'Gambe'],
    ['Crunch', 'Addome'], ['Plank', 'Addome'], ['Leg raise', 'Addome'], ['Russian twist', 'Addome'],
  ];
  await db.tx(async (conn) => {
    for (const [name, group] of items) {
      await conn.query('INSERT IGNORE INTO exercise_catalog (name, muscle_group) VALUES (?,?)', [name, group]);
    }
  });
  console.log(`[seed] catalogo esercizi: ${items.length} voci inserite.`);
}

module.exports = { seedDemo, seedCatalog };
