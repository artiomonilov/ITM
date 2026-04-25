import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();
    await connectDB();

    const user = await User.findOne({ 
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() } // Token sa fie valabil și neexpirat
    });

    if (!user) return NextResponse.json({ message: "Token invalid sau expirat." }, { status: 400 });

    // Criptare noua parola
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Invalidation token & Save password
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { password: newHashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" }
      }
    );

    return NextResponse.json({ message: "Parola a fost modificată." }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "A apărut o eroare la salvare." }, { status: 500 });
  }
}
