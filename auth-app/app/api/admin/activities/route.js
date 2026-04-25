import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import { logAuditEvent } from '@/lib/audit';

const defaultActivities = [
  { title: 'Rezumat text', description: 'Genereaza un rezumat pentru un text lung.', taskPrompt: 'Introdu textul care trebuie rezumat.', tokenCost: 10 },
  { title: 'Generare imagine', description: 'Creeaza o imagine pe baza unei descrieri.', taskPrompt: 'Descrie imaginea dorita.', tokenCost: 50 },
  { title: 'Asistenta dezvoltare software', description: 'Sprijina dezvoltarea unei aplicatii software.', taskPrompt: 'Descrie problema tehnica sau functionalitatea.', tokenCost: 5000 },
  { title: 'Traducere continut', description: 'Traduce continut academic sau tehnic.', taskPrompt: 'Introdu continutul si limba tinta.', tokenCost: 30 },
  { title: 'Generare test grila', description: 'Genereaza un test grila pentru curs.', taskPrompt: 'Precizeaza tema si numarul de intrebari.', tokenCost: 60 },
  { title: 'Explicare concept', description: 'Explica un concept dificil pe intelesul studentilor.', taskPrompt: 'Introdu conceptul care trebuie explicat.', tokenCost: 25 },
  { title: 'Corectare cod', description: 'Propune corectii pentru erori din cod.', taskPrompt: 'Introdu codul si eroarea observata.', tokenCost: 250 },
  { title: 'Analiza dataset', description: 'Sugereaza pasi de analiza pentru un set de date.', taskPrompt: 'Descrie datasetul si obiectivul.', tokenCost: 200 },
  { title: 'Generare prezentare', description: 'Genereaza structura unei prezentari academice.', taskPrompt: 'Introdu tema prezentarii.', tokenCost: 80 },
  { title: 'Plan de invatare', description: 'Construieste un plan de invatare personalizat.', taskPrompt: 'Descrie obiectivul si intervalul de timp.', tokenCost: 40 },
];

async function ensureDefaultActivities() {
  const existingCount = await Activity.countDocuments();
  if (existingCount >= 10) {
    return;
  }

  const existingTitles = new Set((await Activity.find().select('title')).map((item) => item.title));
  const missingActivities = defaultActivities.filter((activity) => !existingTitles.has(activity.title));

  if (missingActivities.length > 0) {
    await Activity.insertMany(missingActivities);
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Admin') {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ message: 'Restricționat: doar administratorii au acces.' }, { status: 403 });
  }

  await connectDB();
  await ensureDefaultActivities();

  const activities = await Activity.find().sort({ createdAt: 1 });
  return NextResponse.json(activities);
}

export async function POST(req) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ message: 'Restricționat: doar administratorii au acces.' }, { status: 403 });
  }

  const { title, description, taskPrompt, tokenCost } = await req.json();
  if (!title || !description || !taskPrompt) {
    return NextResponse.json({ message: 'Titlul, descrierea și sarcina sunt obligatorii.' }, { status: 400 });
  }

  await connectDB();
  const activity = await Activity.create({
    title,
    description,
    taskPrompt,
    tokenCost: Number(tokenCost) || 0,
  });

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorRole: session.user.role,
    action: 'ADMIN_CREATE_ACTIVITY',
    targetType: 'Activity',
    targetId: activity._id.toString(),
    targetLabel: activity.title,
    details: 'Administratorul a adaugat o activitate noua.',
    status: 'SUCCESS',
  });

  return NextResponse.json({ message: 'Activitatea a fost adăugată cu succes.', activity }, { status: 201 });
}
