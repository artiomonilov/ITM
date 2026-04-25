import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { logAuditEvent } from '@/lib/audit';
import { ensureTokenString, validateStrongPassword } from '@/lib/inputSecurity';

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();
    const safeToken = ensureTokenString(token);
    const safePassword = validateStrongPassword(newPassword);

    await connectDB();

    const user = await User.findOne({
      resetToken: safeToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      await logAuditEvent({
        action: 'CONFIRM_PASSWORD_RESET',
        targetType: 'User',
        details: 'Resetare parola esuata: token invalid sau expirat.',
        status: 'FAILURE',
      });
      return NextResponse.json({ message: 'Token invalid sau expirat.' }, { status: 400 });
    }

    const newHashedPassword = await bcrypt.hash(safePassword, 12);

    await User.updateOne(
      { _id: user._id },
      {
        $set: { password: newHashedPassword },
        $unset: { resetToken: '', resetTokenExpiry: '' },
      }
    );

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'CONFIRM_PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      targetLabel: user.email,
      details: 'Parola modificata cu succes.',
      status: 'SUCCESS',
    });

    return NextResponse.json({ message: 'Parola a fost modificata.' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      message: error?.message || 'A aparut o eroare la salvare.',
    }, { status: error?.message ? 400 : 500 });
  }
}
