import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: "Restricționat: Doar administratorii au acces." }, { status: 403 });
    }

    const { targetUserEmail, action, newRole, toggleStatus } = await req.json();
    await connectDB();

    const user = await User.findOne({ email: targetUserEmail });
    if (!user) return NextResponse.json({ message: "User inexistent" }, { status: 404 });

    // Modificare/Atribuire Rol
    if (action === 'modifyRole') {
      if (!['Student', 'Profesor', 'Admin', 'Audit'].includes(newRole)) {
        return NextResponse.json({ message: "Rol invalid. Alegeri permise: Student, Profesor, Admin, Audit" }, { status: 400 });
      }
      user.role = newRole; 
    } 
    // Modificare Stare Activ/Inactiv
    else if (action === 'toggleStatus') {
      user.isActive = toggleStatus;
    } else {
      return NextResponse.json({ message: "Acțiune invalidă" }, { status: 400 });
    }

    await user.save();
    return NextResponse.json({ message: `Acțiune reușită pentru ${user.email}!` }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "A apărut o eroare." }, { status: 500 });
  }
}

export async function GET(req) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: "Restricționat" }, { status: 403 });
    }
    await connectDB();
    const users = await User.find({}, 'email nume prenume role isActive _id');
    return NextResponse.json(users, { status: 200 });
}
