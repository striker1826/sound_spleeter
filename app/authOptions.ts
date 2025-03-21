import {
  DefaultSession,
  NextAuthOptions,
  User as NextAuthUser,
} from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";

interface CustomUser extends NextAuthUser {
  token: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID ?? "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string;
        session.providerAccountId = token.providerAccountId as string;
      }
      return session;
    },
  },
} as NextAuthOptions;

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: User & DefaultSession["user"];
    expires: string;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    refreshTokenExpires?: number;
    providerAccountId?: string;
    error?: "RefreshAccessTokenError";
  }

  interface User {
    id?: string;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    refreshTokenExpires?: number;
    exp: number;
    error?: "RefreshAccessTokenError";
  }
}
