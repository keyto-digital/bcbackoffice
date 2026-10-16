import crypto from "node:crypto";

export interface CustomTokenPayload { sub: string; exp: number; }

function getSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("JWT_SECRET wajib diisi dan minimal 32 karakter pada backend/.env");
  return value;
}

export function createCustomToken(userId: string): string {
  const payload: CustomTokenPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyCustomToken(token: string): CustomTokenPayload | null {
  try {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) return null;
    const expected = crypto.createHmac("sha256", getSecret()).update(encoded).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CustomTokenPayload;
    if (typeof payload.sub !== "string" || !payload.sub || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now()/1000)) return null;
    return payload;
  } catch { return null; }
}
