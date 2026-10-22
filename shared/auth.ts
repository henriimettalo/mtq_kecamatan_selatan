export type AdminRole = "admin" | "viewer";

const AUTH_COOKIE_NAME = "admin_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export { AUTH_COOKIE_NAME, COOKIE_MAX_AGE };

async function hmacSha256(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAuthToken(secret: string, role: AdminRole): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await hmacSha256(secret, `${timestamp}.${role}`);
  return `${timestamp}.${role}.${signature}`;
}

export async function verifyAuthToken(token: string, secret: string): Promise<{ valid: boolean; role: AdminRole | null }> {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, role: null };

  const [timestampStr, roleStr, providedSignature] = parts;

  if (roleStr !== "admin" && roleStr !== "viewer") return { valid: false, role: null };

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return { valid: false, role: null };

  const age = Date.now() - timestamp;
  if (age < 0 || age > COOKIE_MAX_AGE * 1000) return { valid: false, role: null };

  const expectedSignature = await hmacSha256(secret, `${timestampStr}.${roleStr}`);

  if (providedSignature.length !== expectedSignature.length) return { valid: false, role: null };
  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (mismatch !== 0) return { valid: false, role: null };

  return { valid: true, role: roleStr as AdminRole };
}
