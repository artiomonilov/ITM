import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req) {
  try {
    const { token } = await req.json();
    await connectDB();

    const user = await User.findOne({ activationToken: token });

    if (!user) {
      return NextResponse.json({ message: "Token-ul furnizat este invalid." }, { status: 400 });
    }

    if (user.activationTokenExpiry < Date.now()) {
      return NextResponse.json({ message: "Token-ul a expirat." }, { status: 400 });
    }

    if (user.isActive) {
       return NextResponse.json({ message: "Contul tău este deja activat." }, { status: 400 });
    }

    await User.updateOne(
      { _id: user._id },
      { 
        $set: { isActive: true },
        $unset: { activationToken: "", activationTokenExpiry: "" }
      }
    );

    return NextResponse.json({ message: "Cont activat cu succes." }, { status: 200 });
  } catch (error) {
    console.error('Activation Error:', error);
    return NextResponse.json({ message: "A apărut o eroare la server." }, { status: 500 });
  }
}
