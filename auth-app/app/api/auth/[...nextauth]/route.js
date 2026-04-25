import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { logAuditEvent } from "@/lib/audit";

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

        if (!user) {
          await logAuditEvent({
            actorEmail: credentials.email,
            action: 'LOGIN_ATTEMPT',
            targetType: 'User',
            targetLabel: credentials.email,
            details: 'Autentificare esuata: utilizator inexistent.',
            status: 'FAILURE',
          });
          throw new Error("Email sau parolă greșită.");
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) {
          await logAuditEvent({
            actorId: user._id,
            actorEmail: user.email,
            actorRole: user.role,
            action: 'LOGIN_ATTEMPT',
            targetType: 'User',
            targetId: user._id.toString(),
            targetLabel: user.email,
            details: 'Autentificare esuata: parola incorecta.',
            status: 'FAILURE',
          });
          throw new Error("Email sau parolă greșită.");
        }

        if (!user.isActive) {
          const isSuspendedAccount = !user.activationToken;
          await logAuditEvent({
            actorId: user._id,
            actorEmail: user.email,
            actorRole: user.role,
            action: 'LOGIN_ATTEMPT',
            targetType: 'User',
            targetId: user._id.toString(),
            targetLabel: user.email,
            details: isSuspendedAccount
              ? 'Autentificare blocata: cont suspendat.'
              : 'Autentificare blocata: cont inactiv.',
            status: 'FAILURE',
          });
          if (isSuspendedAccount) {
            throw new Error("Eroarea la conectare");
          }

          throw new Error("Contul tău nu este activat. Verifică e-mail-ul pentru activare.");
        }

        await logAuditEvent({
          actorId: user._id,
          actorEmail: user.email,
          actorRole: user.role,
          action: 'LOGIN_SUCCESS',
          targetType: 'User',
          targetId: user._id.toString(),
          targetLabel: user.email,
          details: 'Autentificare reusita.',
          status: 'SUCCESS',
        });

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
        token.suspended = false;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      if (token?.id) {
        await connectDB();
        const currentUser = await User.findById(token.id).select('role nume prenume email isActive activationToken');

        if (!currentUser) {
          token.suspended = true;
          return token;
        }

        token.role = currentUser.role;
        token.nume = currentUser.nume;
        token.prenume = currentUser.prenume;
        token.email = currentUser.email;
        token.suspended = !currentUser.isActive && !currentUser.activationToken;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.nume = token.nume;
      session.user.prenume = token.prenume;
      session.user.email = token.email;
      session.user.suspended = Boolean(token.suspended);
      return session;
    }
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "supersecret12345", // Ideally generate this in .env
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
