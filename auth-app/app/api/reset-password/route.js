import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { sendResetEmail } from '@/lib/mailer';

export async function POST(req) {
  try {
    const { email } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      // Returnam succes oarecum ca the user sa nu stie daca un email exsita au ba (security practice)
      return NextResponse.json({ message: "Dacă adresa există, ai primit un email." }, { status: 200 });
    }

    // Generate Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 ORA

    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken, resetTokenExpiry } }
    );

    // Creare Link Frontend
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${resetToken}`;
    
    // Trimite Mail
    const emailSent = await sendResetEmail(user.email, resetUrl);

    if (!emailSent) {
       return NextResponse.json({ message: "Eroare la trimiterea email-ului de resetare. Verifica setarile SMTP in .env." }, { status: 500 });
    }

    return NextResponse.json({ message: "Dacă adresa există, ai primit un email." }, { status: 200 });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ message: "A apărut o eroare interna." }, { status: 500 });
  }
}
