import { timingSafeEqual, scryptSync, createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { createAuthToken, verifyAuthToken, AUTH_COOKIE_NAME, COOKIE_MAX_AGE, type AdminRole } from "../shared/auth";
import { config } from "./config";
import { db } from "./db";
import { PARTICIPANT_COOKIE } from "../shared/google-oauth";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function idValue(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new HttpError(400, "ID tidak valid.");
  return n;
}
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function verifyPassword(password: unknown, encoded: string) {
  if (typeof password !== "string" || password.length > 1024 || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded)) return false;
  const [, salt, digest] = encoded.split(":");
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex"));
}
export async function roleFor(req: Request): Promise<AdminRole | null> {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string") return null;
  const result = await verifyAuthToken(token, config.sessionSecret);
  return result.valid ? result.role : null;
}
export async function requireRole(req: Request, admin = false) {
  const role = await roleFor(req);
  if (!role) throw new HttpError(401, "Silakan masuk sebagai admin.");
  if (admin && role !== "admin") throw new HttpError(403, "Hanya admin yang dapat melakukan tindakan ini.");
  return role;
}
export async function loginCookie(res: Response, role: AdminRole) {
  res.cookie(AUTH_COOKIE_NAME, await createAuthToken(config.sessionSecret, role), {
    httpOnly: true, secure: config.secure, sameSite: "lax", maxAge: COOKIE_MAX_AGE * 1000, path: "/",
  });
}
export async function subjectFor(req: Request): Promise<string | null> {
  const token = req.cookies?.[PARTICIPANT_COOKIE];
  if (typeof token !== "string" || !/^[a-f0-9-]{36}$/.test(token)) return null;
  const session = await db.participantSession.findUnique({ where: { token_hash: hash(token) } });
  return session && session.expires_at > Math.floor(Date.now() / 1000) ? session.google_sub : null;
}
export function sameOrigin(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method) || req.path.startsWith("/api/v1/")) return next();
  if (req.get("origin") !== config.origin) return next(new HttpError(403, "Permintaan harus berasal dari aplikasi ini."));
  next();
}
export function wire(value: unknown): any {
  if (value instanceof Date) return value.toISOString().slice(0, 19).replace("T", " ");
  if (Array.isArray(value)) return value.map(wire);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, wire(item)]));
  return value;
}
