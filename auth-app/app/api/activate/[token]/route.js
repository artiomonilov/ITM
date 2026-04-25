import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req, { params }) {
  try {
    const { token } = await params;
    await connectDB();

    console.log("Token cautat:", token);
    
    const user = await User.findOne({
      activationToken: token
    });

    console.log("User gasit dupa token brut:", user);

    if (!user) {
      return NextResponse.json({ message: "Token-ul furnizat este invalid." }, { status: 400 });
    }

    if (user.activationTokenExpiry < Date.now()) {
      return NextResponse.json({ message: "Token-ul a expirat." }, { status: 400 });
    }

    if (user.isActive) {
       return NextResponse.json({ message: "Contul tău este deja activat." }, { status: 400 });
    }

    // Setam statusul pe True si stergem token-ul folosit
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
