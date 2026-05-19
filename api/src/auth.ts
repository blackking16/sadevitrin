import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { prisma } from './prisma';

export type AuthRequest = Request & {
  user?: {
    id: string;
    role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
  };
};

type AuthUser = NonNullable<AuthRequest['user']>;

const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { id: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: '30d' });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Oturum gerekli.' });
  }

  try {
    const payload = jwt.verify(header.slice(7), jwtSecret) as { sub: string; role: AuthUser['role'] };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
    }

    req.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Geçersiz oturum.' });
  }
}

export function requireRole(...roles: Array<'CUSTOMER' | 'SELLER' | 'ADMIN'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Yetki yok.' });
    }

    return next();
  };
}
