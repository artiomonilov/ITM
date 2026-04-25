import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Restricționat: Doar administratorii pot gestiona rolurile." }, { status: 403 });
    }

    const { targetUserEmail, action, newRole } = await req.json();
    await connectDB();

    const user = await User.findOne({ email: targetUserEmail });
    if (!user) return NextResponse.json({ message: "User inexistent" }, { status: 404 });

    // 1. Atribuire (2p) / 2. Modificare (2p)
    if (action === 'assign' || action === 'modify') {
      if (!newRole) return NextResponse.json({ message: "Rol invalid" }, { status: 400 });
      user.role = newRole; 
    } 
    // 3. Revocare (2p) - îl aducem la rolul de bază
    else if (action === 'revoke') {
      user.role = 'user'; 
    } else {
      return NextResponse.json({ message: "Acțiune invalidă" }, { status: 400 });
    }

    await user.save();
    return NextResponse.json({ message: "Rol actualizat cu succes!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "A apărut o eroare." }, { status: 500 });
  }
}

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Restricționat" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find({}, 'email role _id');
    return NextResponse.json(users, { status: 200 });
}
