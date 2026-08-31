import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hr-system-secret-key-2024";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: {
  id: number;
  role: string;
  name: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "365d" });
}

export function verifyToken(token: string): {
  id: number;
  role: string;
  name: string;
} | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      id: number;
      role: string;
      name: string;
    };
  } catch {
    return null;
  }
}
