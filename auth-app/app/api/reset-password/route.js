import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendResetEmail } from '@/lib/mailer';
import { logAuditEvent } from '@/lib/audit';
import { normalizeEmail } from '@/lib/inputSecurity';

const GENERIC_RESET_MESSAGE = 'Daca adresa exista, ai primit un email.';

export async function POST(req) {
  let safeEmail = '';

  try {
    const { email } = await req.json();
    safeEmail = normalizeEmail(email);
  } catch (error) {
    await logAuditEvent({
      actorEmail: safeEmail || 'invalid-email',
      action: 'REQUEST_PASSWORD_RESET',
      targetType: 'User',
      targetLabel: safeEmail || 'invalid-email',
      details: 'Solicitare resetare parola cu email invalid.',
      status: 'FAILURE',
    });

    return NextResponse.json({ message: GENERIC_RESET_MESSAGE }, { status: 200 });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: safeEmail });
    if (!user) {
      await logAuditEvent({
        actorEmail: safeEmail,
        action: 'REQUEST_PASSWORD_RESET',
        targetType: 'User',
        targetLabel: safeEmail,
        details: 'Solicitare resetare parola pentru utilizator inexistent.',
        status: 'FAILURE',
      });

      return NextResponse.json({ message: GENERIC_RESET_MESSAGE }, { status: 200 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000;

    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken, resetTokenExpiry } }
    );

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;
    const emailSent = await sendResetEmail(user.email, resetUrl);

    if (!emailSent) {
      await logAuditEvent({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'REQUEST_PASSWORD_RESET',
        targetType: 'User',
        targetId: user._id.toString(),
        targetLabel: user.email,
        details: 'Emailul de resetare nu a putut fi trimis.',
        status: 'FAILURE',
      });

      return NextResponse.json({ message: 'Eroare la trimiterea email-ului de resetare. Verifica setarile SMTP in .env.' }, { status: 500 });
    }

    await logAuditEvent({
      actorId: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'REQUEST_PASSWORD_RESET',
      targetType: 'User',
      targetId: user._id.toString(),
      targetLabel: user.email,
      details: 'Solicitare resetare parola trimisa cu succes.',
      status: 'SUCCESS',
    });

    return NextResponse.json({ message: GENERIC_RESET_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ message: 'A aparut o eroare interna.' }, { status: 500 });
  }
}
