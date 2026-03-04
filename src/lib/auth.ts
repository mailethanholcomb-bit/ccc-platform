import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
    };
  }

  interface User {
    id: string;
    email: string;
    role: string;
    status: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    role: string;
    status: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        if (user.status === 'locked') {
          throw new Error('Account is locked. Please contact an administrator.');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        role: token.role,
        status: token.status,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
