import { randomBytes, scryptSync } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
function passwordHash(password:string) {const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;}
export function setupTestEnvironment() {
  const url=process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL harus menunjuk database berakhiran _test.");
  process.env.DATABASE_URL=url;
  process.env.APP_URL="http://localhost:33317";
  process.env.NODE_ENV="test";
  process.env.SESSION_SECRET="mtq-test-session-secret-only-123456789";
  process.env.ADMIN_USERNAME="admin";process.env.ADMIN_PASSWORD_HASH=passwordHash("mtq-test-admin");
  process.env.VIEWER_USERNAME="viewer";process.env.VIEWER_PASSWORD_HASH=passwordHash("mtq-test-viewer");
  process.env.GOOGLE_CLIENT_ID="";process.env.GOOGLE_CLIENT_SECRET="";
  process.env.UPLOAD_DIR=join(tmpdir(),"mtq-vps-test-uploads");
  process.env.ASSET_DIR=join(tmpdir(),"mtq-vps-test-assets");
}
