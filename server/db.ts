import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";
const url = new URL(process.env.DATABASE_URL || "mysql://unused:unused@localhost:3306/mtq");
const adapter = new PrismaMariaDb({
  host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),
  password:decodeURIComponent(url.password),database:url.pathname.slice(1),connectionLimit:5,timezone:"+00:00",
});
export const db = new PrismaClient({adapter});
