import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authOptions } from './auth';

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getServerSession();

  if (!session || !session.user) {
    throw new Error('Authentication required');
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (session.user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return session;
}

export async function requireMember() {
  const session = await requireAuth();

  if (session.user.role !== 'member') {
    throw new Error('Member access required');
  }

  return session;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function generateInviteToken(): string {
  return crypto.randomUUID();
}
