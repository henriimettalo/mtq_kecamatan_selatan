import { readFile, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
const hashPassword = password => {const salt=randomBytes(16).toString("hex");return `scrypt:${salt}:${scryptSync(password,salt,64).toString("hex")}`;};
const filename = ".env";
let content;
try {content=await readFile(filename,"utf8");} catch {content=await readFile(".env.example","utf8");}
function get(key) {return content.match(new RegExp(`^${key}=(.*)$`,"m"))?.[1]||"";}
function set(key,value) {const regex=new RegExp(`^${key}=.*$`,"m");content=regex.test(content)?content.replace(regex,`${key}=${value}`):content+`\n${key}=${value}\n`;}
for (const key of ["SESSION_SECRET","MYSQL_PASSWORD","MYSQL_ROOT_PASSWORD"]) if (!get(key)||get(key)==="CHANGE_ME") set(key,randomBytes(32).toString("hex"));
if (!get("ADMIN_PASSWORD_HASH")||get("ADMIN_PASSWORD_HASH")==="CHANGE_ME") {
  const password=randomBytes(18).toString("base64url");set("ADMIN_PASSWORD_HASH",hashPassword(password));
  console.log(`Username admin: ${get("ADMIN_USERNAME")||"admin"}\nSandi admin (simpan sekarang): ${password}`);
}
if (process.argv.includes("--viewer")) {
  const password=randomBytes(18).toString("base64url");set("VIEWER_PASSWORD_HASH",hashPassword(password));
  console.log(`Username viewer: ${get("VIEWER_USERNAME")||"viewer"}\nSandi viewer (simpan sekarang): ${password}`);
}
if (!get("DATABASE_URL")||get("DATABASE_URL").includes("CHANGE_ME")) set("DATABASE_URL",`mysql://${get("MYSQL_USER")}:${get("MYSQL_PASSWORD")}@db:3306/${get("MYSQL_DATABASE")}`);
await writeFile(filename,content,{mode:0o600});
console.log("Konfigurasi tersimpan di .env. Sesuaikan APP_URL dengan domain Anda.");
