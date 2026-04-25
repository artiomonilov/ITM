import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

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
    
    // Creare cont implicit Activ și cu rolul de bază configurat în Model (Student)
    await User.create({ 
      nume, 
      prenume, 
      email, 
      password: hashedPassword 
    });
    
    return NextResponse.json({ message: "Cont creat cu succes!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Eroare la înregistrare." }, { status: 500 });
  }
}
