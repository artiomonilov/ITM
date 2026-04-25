import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
  try {
    const { email, newPassword } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });
    if (!user) return NextResponse.json({ message: "User inexistent." }, { status: 404 });

    // HASH PE NOUA PAROLĂ (Securitate bază de date)
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return NextResponse.json({ message: "Parolă resetată cu succes!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "A apărut o eroare." }, { status: 500 });
  }
}
