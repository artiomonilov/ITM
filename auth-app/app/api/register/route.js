import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendActivationEmail } from '@/lib/mailer';
import { logAuditEvent } from '@/lib/audit';
import { normalizeEmail, normalizeName, validateStrongPassword } from '@/lib/inputSecurity';

export async function POST(req) {
  try {
    const { nume, prenume, email, password } = await req.json();
    const safeNume = normalizeName(nume, 'Nume');
    const safePrenume = normalizeName(prenume, 'Prenume');
    const safeEmail = normalizeEmail(email);
    const safePassword = validateStrongPassword(password);

    await connectDB();

    const existingUser = await User.findOne({ email: safeEmail });
    if (existingUser) {
      return NextResponse.json({ message: 'Email deja folosit.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(safePassword, 12);
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpiry = Date.now() + 24 * 3600000;

    const newUser = await User.create({
      nume: safeNume,
      prenume: safePrenume,
      email: safeEmail,
      password: hashedPassword,
      isActive: false,
      activationToken,
      activationTokenExpiry,
    });

    const activationUrl = `${process.env.NEXTAUTH_URL}/activate/${activationToken}`;
    const emailSent = await sendActivationEmail(newUser.email, activationUrl);

    if (!emailSent) {
      await logAuditEvent({
        actorId: newUser._id,
        actorEmail: newUser.email,
        actorRole: newUser.role,
        action: 'REGISTER_USER',
        targetType: 'User',
        targetId: newUser._id.toString(),
        targetLabel: newUser.email,
        details: 'Cont creat, dar emailul de activare nu a putut fi trimis.',
        status: 'FAILURE',
      });

      return NextResponse.json({ message: 'Cont creat, dar email-ul de activare nu a putut fi trimis.' }, { status: 500 });
    }

    await logAuditEvent({
      actorId: newUser._id,
      actorEmail: newUser.email,
      actorRole: newUser.role,
      action: 'REGISTER_USER',
      targetType: 'User',
      targetId: newUser._id.toString(),
      targetLabel: newUser.email,
      details: 'Cont nou inregistrat si email de activare trimis.',
      status: 'SUCCESS',
    });

    return NextResponse.json({
      message: 'Cont creat cu succes! Verifica e-mail-ul pentru activare.',
    }, { status: 201 });
  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json({
      message: error?.message || 'Eroare interna la inregistrare.',
    }, { status: error?.message ? 400 : 500 });
  }
}
