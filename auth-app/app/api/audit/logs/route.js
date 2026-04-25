import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'Audit' && session.user.role !== 'Admin')) {
      return NextResponse.json({ message: 'Restrictionat: doar rolurile Audit si Admin au acces.' }, { status: 403 });
    }

    await connectDB();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json({ message: 'Eroare la incarcarea jurnalului.' }, { status: 500 });
  }
}
