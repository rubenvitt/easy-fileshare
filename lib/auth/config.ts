import type { NextAuthConfig } from "next-auth";
import "./types";

export const authConfig: NextAuthConfig = {
  providers: [
    {
      id: "pocketid",
      name: "PocketID",
      type: "oidc",
      issuer: process.env.OIDC_ISSUER,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email groups",
        },
      },
    },
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt({ token, profile, trigger }) {
      if (trigger === "signIn" && profile) {
        // Extract groups claim from the OIDC profile
        const groups = profile.groups;
        if (Array.isArray(groups)) {
          token.groups = groups as string[];
        } else {
          token.groups = [];
        }
      }
      return token;
    },
    session({ session, token }) {
      const adminGroup = process.env.OIDC_ADMIN_GROUP ?? "";
      const groups = token.groups ?? [];
      const isAdmin = groups.includes(adminGroup);
      session.isAdmin = isAdmin;
      if (session.user) {
        session.user.isAdmin = isAdmin;
      }
      return session;
    },
  },
};
