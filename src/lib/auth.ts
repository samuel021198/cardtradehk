import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeHkPhone } from "@/lib/phone";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        phone: { label: "電話", type: "tel" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials) {
        const raw = String(credentials?.phone ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (password.length < 6) return null;

        const phone = normalizeHkPhone(raw);
        const user = phone
          ? await prisma.user.findUnique({ where: { phone } })
          : await prisma.user.findFirst({
              where: { OR: [{ username: raw }, { username: raw.toLowerCase() }] },
            });
        if (!user || user.status === "BLOCKED") return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          phone: user.phone,
          displayName: user.displayName,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.phone = user.phone;
        token.displayName = user.displayName;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.phone = token.phone;
      session.user.displayName = token.displayName;
      session.user.role = token.role;
      session.user.name = token.displayName;
      return session;
    },
  },
});
