import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendActivationEmail } from '@/lib/mailer';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req) {
  try {
    const { nume, prenume, email, password } = await req.json();
    
    if (!nume || !prenume || !email || !password) {
      return NextResponse.json({ message: "Toate câmpurile sunt obligatorii." }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email });
    if (existingUser) return NextResponse.json({ message: "Email deja folosit." }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generează Token de Activare (Valabil 24 ore)
    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationTokenExpiry = Date.now() + 24 * 3600000;
    
    // Creare cont implicit Inactiv
    const newUser = await User.create({ 
      nume, 
      prenume, 
      email, 
      password: hashedPassword,
      isActive: false,
      activationToken,
      activationTokenExpiry
    });

    // Construiește URL și Trimite Email 
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
      // Poti adauga rollback la user in sisteme reale, dar e ok aici
      return NextResponse.json({ message: "Cont creat, dar email-ul de activare nu a putut fi trimis." }, { status: 500 });
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
    
    return NextResponse.json({ message: "Cont creat cu succes! Verifică e-mail-ul pentru activare." }, { status: 201 });
  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json({ message: "Eroare internă la înregistrare." }, { status: 500 });
  }
}
