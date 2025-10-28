import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePasswords(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: any) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
