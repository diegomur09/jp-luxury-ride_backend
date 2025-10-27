import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'

export function signJwt(payload: object, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', ...options })
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

export type JwtPayload = string | jwt.JwtPayload | null
