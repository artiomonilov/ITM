import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req) {
  try {
    const { token } = await req.json();
    await connectDB();

    const user = await User.findOne({ activationToken: token });

    if (!user) {
      await logAuditEvent({
        action: 'ACTIVATE_ACCOUNT',
        targetType: 'User',
        details: 'Activare esuata: token invalid.',
        status: 'FAILURE',
      });
      return NextResponse.json({ message: "Token-ul furnizat este invalid." }, { status: 400 });
    }

    if (user.activationTokenExpiry < Date.now()) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'ACTIVATE_ACCOUNT',
        targetType: 'User',
        targetId: user._id.toString(),
        targetLabel: user.email,
        details: 'Activare esuata: token expirat.',
        status: 'FAILURE',
      });
      return NextResponse.json({ message: "Token-ul a expirat." }, { status: 400 });
    }

    if (user.isActive) {
       await logAuditEvent({
         actorId: user._id,
         actorEmail: user.email,
         actorRole: user.role,
         action: 'ACTIVATE_ACCOUNT',
         targetType: 'User',
         targetId: user._id.toString(),
         targetLabel: user.email,
         details: 'Activare ignorata: cont deja activ.',
         status: 'FAILURE',
       });
       return NextResponse.json({ message: "Contul tău este deja activat." }, { status: 400 });
    }

    await User.updateOne(
      { _id: user._id },
      { 
        $set: { isActive: true },
        $unset: { activationToken: "", activationTokenExpiry: "" }
      }
    );

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'ACTIVATE_ACCOUNT',
      targetType: 'User',
      targetId: user._id.toString(),
      targetLabel: user.email,
      details: 'Cont activat cu succes.',
      status: 'SUCCESS',
    });

    return NextResponse.json({ message: "Cont activat cu succes." }, { status: 200 });
  } catch (error) {
    console.error('Activation Error:', error);
    return NextResponse.json({ message: "A apărut o eroare la server." }, { status: 500 });
  }
}
