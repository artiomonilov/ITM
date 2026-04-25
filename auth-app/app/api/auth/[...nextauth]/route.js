import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();
        const user = await User.findOne({ email: credentials.email });

        if (!user) throw new Error("Email sau parolă greșită.");

        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) throw new Error("Email sau parolă greșită.");

        if (!user.isActive) {
          throw new Error("Contul tău nu este activat. Verifică e-mail-ul pentru activare.");
        }

        return { id: user._id.toString(), email: user.email, role: user.role, nume: user.nume, prenume: user.prenume };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.nume = user.nume;
        token.prenume = user.prenume;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.nume = token.nume;
      session.user.prenume = token.prenume;
      return session;
    }
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "supersecret12345", // Ideally generate this in .env
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
