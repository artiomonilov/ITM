import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import Activity from '@/models/Activity';
import { ensureDefaultActivities } from '@/lib/activityCatalog';
import { logAuditEvent } from '@/lib/audit';

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
    return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
  }

  await connectDB();
  await ensureDefaultActivities();

  const activities = await Activity.find().sort({ createdAt: 1 });
  return NextResponse.json(activities);
}

export async function POST(req) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ message: 'Restrictionat: doar administratorii au acces.' }, { status: 403 });
  }

  const { title, description, taskPrompt, tokenCost, subscriptionCost, executionType, aiResourceType } = await req.json();
  if (!title || !description || !taskPrompt) {
    return NextResponse.json({ message: 'Titlul, descrierea si sarcina sunt obligatorii.' }, { status: 400 });
  }

  await connectDB();
  const activity = await Activity.create({
    title,
    description,
    taskPrompt,
    tokenCost: Number(tokenCost) || 0,
    subscriptionCost: Number(subscriptionCost) || 0,
    executionType: executionType === 'VPS_PLACEHOLDER' ? 'VPS_PLACEHOLDER' : 'AI',
    aiResourceType: aiResourceType === 'image' || aiResourceType === 'code' ? aiResourceType : 'text',
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
