import "dotenv/config";
const origin = new URL(process.env.APP_URL || "http://localhost:5173").origin;
export const config = {
  origin, secure: origin.startsWith("https:"), production: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 3000),
  sessionSecret: process.env.SESSION_SECRET || "",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminHash: process.env.ADMIN_PASSWORD_HASH || "",
  viewerUsername: process.env.VIEWER_USERNAME || "viewer",
  viewerHash: process.env.VIEWER_PASSWORD_HASH || "",
  uploadDir: process.env.UPLOAD_DIR || "./storage/uploads",
  assetDir: process.env.ASSET_DIR || "./storage/event-assets",
};
export function validateConfig() {
  if (config.sessionSecret.length < 32 || !/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.adminHash)) {
    throw new Error("Isi SESSION_SECRET (minimal 32 karakter) dan ADMIN_PASSWORD_HASH. Jalankan npm run credentials.");
  }
  if (config.production && !config.secure) throw new Error("APP_URL produksi harus menggunakan https://.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi.");
}
