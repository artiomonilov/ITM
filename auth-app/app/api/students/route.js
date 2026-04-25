import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'Admin' && session.user.role !== 'Profesor')) {
      return NextResponse.json({ message: "Neautorizat" }, { status: 403 });
    }

    await connectDB();
    const students = await User.find({ role: 'Student', isActive: true }).select('nume prenume email _id');
    return NextResponse.json(students, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Eroare la procesarea cererii.", error }, { status: 500 });
  }
}
