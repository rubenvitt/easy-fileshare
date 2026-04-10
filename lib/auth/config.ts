import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import "./types";

const isDevMode = process.env.AUTH_DEV_MODE === "true";

const oidcProvider = {
  id: "pocketid",
  name: "PocketID",
  type: "oidc" as const,
  issuer: process.env.OIDC_ISSUER,
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  authorization: {
    params: {
      scope: "openid profile email groups",
    },
  },
};

const devProvider = Credentials({
  name: "Dev Login",
  credentials: {
    name: { label: "Name", type: "text", placeholder: "Admin" },
  },
  async authorize(credentials) {
    const name = (credentials?.name as string) || "Dev Admin";
    return {
      id: "dev-user",
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@dev.local`,
    };
  },
});

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: isDevMode ? [devProvider] : [oidcProvider],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, profile, trigger }) {
      if (isDevMode) {
        token.groups = [process.env.OIDC_ADMIN_GROUP ?? "fileshare-admin"];
        return token;
      }
      if (trigger === "signIn" && profile) {
        const groups = profile.groups;
        token.groups = Array.isArray(groups) ? (groups as string[]) : [];
      }
      return token;
    },
    session({ session, token }) {
      const adminGroup = process.env.OIDC_ADMIN_GROUP ?? "fileshare-admin";
      const groups = token.groups ?? [];
      const isAdmin = isDevMode || groups.includes(adminGroup);
      session.isAdmin = isAdmin;
      if (session.user) {
        session.user.isAdmin = isAdmin;
      }
      return session;
    },
  },
};
