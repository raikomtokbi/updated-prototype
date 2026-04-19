import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";

const ENV_SECRET = process.env.JWT_SECRET;
if (!ENV_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[jwt] WARNING: JWT_SECRET not set in production — using ephemeral random secret. Existing sessions will invalidate on restart.");
}
const SECRET: string = ENV_SECRET || crypto.randomBytes(48).toString("hex");

const DEFAULT_TTL = "30d";

export interface UserTokenClaims {
  uid: string;
  role?: string;
}

export function signUserToken(claims: UserTokenClaims, expiresIn: string | number = DEFAULT_TTL): string {
  return jwt.sign(claims, SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyUserToken(token: string): UserTokenClaims | null {
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload & UserTokenClaims;
    if (!decoded?.uid) return null;
    return { uid: decoded.uid, role: decoded.role };
  } catch {
    return null;
  }
}

export function extractBearerToken(authorization: string | undefined | null): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}
