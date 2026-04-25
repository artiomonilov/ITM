import Activity from '@/models/Activity';

export const defaultActivities = [
  {
    title: 'Rezumat text',
    description: 'Genereaza un rezumat pentru un text lung.',
    taskPrompt: 'Introdu textul care trebuie rezumat.',
    tokenCost: 10,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Generare imagine',
    description: 'Creeaza o imagine pe baza unei descrieri.',
    taskPrompt: 'Descrie imaginea dorita.',
    tokenCost: 50,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Asistenta dezvoltare software',
    description: 'Sprijina dezvoltarea unei aplicatii software.',
    taskPrompt: 'Descrie problema tehnica sau functionalitatea.',
    tokenCost: 5000,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Traducere continut',
    description: 'Traduce continut academic sau tehnic.',
    taskPrompt: 'Introdu continutul si limba tinta.',
    tokenCost: 30,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Generare test grila',
    description: 'Genereaza un test grila pentru curs.',
    taskPrompt: 'Precizeaza tema si numarul de intrebari.',
    tokenCost: 60,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Explicare concept',
    description: 'Explica un concept dificil pe intelesul studentilor.',
    taskPrompt: 'Introdu conceptul care trebuie explicat.',
    tokenCost: 25,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Corectare cod',
    description: 'Propune corectii pentru erori din cod.',
    taskPrompt: 'Introdu codul si eroarea observata.',
    tokenCost: 250,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Analiza dataset',
    description: 'Sugereaza pasi de analiza pentru un set de date.',
    taskPrompt: 'Descrie datasetul si obiectivul.',
    tokenCost: 200,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Generare prezentare',
    description: 'Genereaza structura unei prezentari academice.',
    taskPrompt: 'Introdu tema prezentarii.',
    tokenCost: 80,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Plan de invatare',
    description: 'Construieste un plan de invatare personalizat.',
    taskPrompt: 'Descrie obiectivul si intervalul de timp.',
    tokenCost: 40,
    subscriptionCost: 0,
    executionType: 'AI',
  },
  {
    title: 'Acces laborator VPS',
    description: 'Solicita si valideaza accesul la un mediu VPS pentru laborator.',
    taskPrompt: 'Descrie pe scurt ce vrei sa rulezi in VPS.',
    tokenCost: 0,
    subscriptionCost: 1,
    executionType: 'VPS_PLACEHOLDER',
  },
];

export async function ensureDefaultActivities() {
  const existingActivities = await Activity.find().select('title tokenCost subscriptionCost executionType');
  const existingByTitle = new Map(existingActivities.map((item) => [item.title, item]));

  const missingActivities = defaultActivities.filter((activity) => !existingByTitle.has(activity.title));
  if (missingActivities.length > 0) {
    await Activity.insertMany(missingActivities);
  }

  for (const activity of defaultActivities) {
    const existing = existingByTitle.get(activity.title);
    if (!existing) {
      continue;
    }

    const patch = {};
    if (typeof existing.tokenCost !== 'number') {
      patch.tokenCost = activity.tokenCost;
    }
    if (typeof existing.subscriptionCost !== 'number') {
      patch.subscriptionCost = activity.subscriptionCost;
    }
    if (!existing.executionType) {
      patch.executionType = activity.executionType;
    }

    if (Object.keys(patch).length > 0) {
      await Activity.updateOne({ _id: existing._id }, { $set: patch });
    }
  }
}
