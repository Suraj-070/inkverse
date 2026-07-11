import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabase";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    // Upsert user row in Supabase on first sign-in; attach uuid to token
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        const { data } = await supabaseAdmin
          .from("users")
          .upsert(
            {
              email: profile.email,
              name: profile.name ?? null,
              image: (profile as { picture?: string }).picture ?? null,
            },
            { onConflict: "email" }
          )
          .select("id")
          .single();
        if (data) token.uid = data.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
