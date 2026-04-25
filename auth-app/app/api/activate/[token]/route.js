import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { ensureTokenString } from '@/lib/inputSecurity';

export async function GET(req, { params }) {
  try {
    const { token } = await params;
    const safeToken = ensureTokenString(token);

    await connectDB();

    const user = await User.findOne({
      activationToken: safeToken,
    });

    if (!user) {
      return NextResponse.json({ message: 'Token-ul furnizat este invalid.' }, { status: 400 });
    }

    if (user.activationTokenExpiry < Date.now()) {
      return NextResponse.json({ message: 'Token-ul a expirat.' }, { status: 400 });
    }

    if (user.isActive) {
      return NextResponse.json({ message: 'Contul tau este deja activat.' }, { status: 400 });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: { isActive: true },
        $unset: { activationToken: '', activationTokenExpiry: '' },
      }
    );

    return NextResponse.json({ message: 'Cont activat cu succes.' }, { status: 200 });
  } catch (error) {
    console.error('Activation Error:', error);
    return NextResponse.json({ message: error?.message || 'A aparut o eroare la server.' }, { status: error?.message ? 400 : 500 });
  }
}
