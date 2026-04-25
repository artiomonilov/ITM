import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logAuditEvent } from '@/lib/audit';
import { normalizeEmail, normalizeName } from '@/lib/inputSecurity';

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: "Restrictionat: Doar administratorii au acces." }, { status: 403 });
    }

    const { targetUserEmail, action, newRole, toggleStatus, newNume, newPrenume } = await req.json();
    const safeTargetUserEmail = normalizeEmail(targetUserEmail);
    await connectDB();

    const user = await User.findOne({ email: safeTargetUserEmail });
    if (!user) {
      return NextResponse.json({ message: "User inexistent" }, { status: 404 });
    }

    if (action === 'modifyRole') {
      if (!['Student', 'Profesor', 'Admin', 'Audit'].includes(newRole)) {
        return NextResponse.json({ message: "Rol invalid. Alegeri permise: Student, Profesor, Admin, Audit" }, { status: 400 });
      }
      user.role = newRole;
    } else if (action === 'toggleStatus') {
      user.isActive = Boolean(toggleStatus);
    } else if (action === 'updateDetails') {
      user.nume = normalizeName(newNume, 'Nume');
      user.prenume = normalizeName(newPrenume, 'Prenume');
    } else {
      return NextResponse.json({ message: "Actiune invalida" }, { status: 400 });
    }

    await user.save();
    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      action: `ADMIN_${action.toUpperCase()}`,
      targetType: 'User',
      targetId: user._id.toString(),
      targetLabel: user.email,
      details: `Administratorul a executat actiunea ${action}.`,
      status: 'SUCCESS',
      metadata: { newRole, toggleStatus, newNume, newPrenume },
    });
    return NextResponse.json({ message: `Actiune reusita pentru ${user.email}!` }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error?.message || "A aparut o eroare interna." }, { status: error?.message ? 400 : 500 });
  }
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Admin') {
    return NextResponse.json({ error: "Restrictionat" }, { status: 403 });
  }
  await connectDB();
  const users = await User.find({}, 'email nume prenume role isActive _id');
  return NextResponse.json(users, { status: 200 });
}
