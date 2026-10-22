import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { config } from "./config";
import { db } from "./db";
import { sameOrigin, HttpError } from "./security";
import { pages } from "./pages";
import { admin, eventAssetUpload } from "./admin";
import { participantAuth } from "./participant-auth";
import { registration } from "./registration";
import { integrationApi } from "./integration-api";
import { files } from "./files";
import { readPrivateFile } from "./storage";
export const app = express();
app.disable("x-powered-by");
// Exactly one proxy sits in front of Express in the supplied Nginx configuration.
app.set("trust proxy",1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:","blob:"],fontSrc:["'self'"],connectSrc:["'self'"],objectSrc:["'self'"],frameAncestors:["'none'"],upgradeInsecureRequests:config.secure?[]:null}},strictTransportSecurity:config.secure?undefined:false}));
app.use(cookieParser());
app.use(sameOrigin);
app.use(express.json({limit:"256kb"}));
app.use(express.urlencoded({extended:false,limit:"16kb"}));
app.use(["/api","/admin/files","/admin/export"],(_req,res,next)=>{res.set("Cache-Control","no-store");next();});
app.get("/api/health",async(_req,res) => {
  try {await db.siteSettings.findUnique({where:{id:1}});res.json({status:"ok"});}
  catch {res.status(503).json({status:"unavailable"});}
});
app.use("/api/page",pages);
app.use("/api/admin",admin);
app.use("/api/register",registration);
app.use("/api/v1",integrationApi);
app.use("/api",participantAuth);
app.post("/api/event-assets",...eventAssetUpload);
app.get("/api/event-assets/:key",async(req,res) => {
  const key = String(req.params.key);
  if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|pdf)$/.test(key)) throw new HttpError(404,"Berkas tidak ditemukan.");
  const file = await readPrivateFile(config.assetDir,key);
  if (!file) throw new HttpError(404,"Berkas tidak ditemukan.");
  res.type(file.type).send(file.body);
});
app.use("/admin",files);
app.use("/api",(_req,res)=>res.status(404).json({error:"Endpoint tidak ditemukan."}));
const dist = resolve("dist");
if (existsSync(resolve(dist,"index.html"))) {
  app.use(express.static(dist,{index:false}));
  app.get("/{*path}",(_req,res)=>res.sendFile(resolve(dist,"index.html")));
}
app.use((error: any,_req: express.Request,res: express.Response,_next: express.NextFunction) => {
  const status = error instanceof HttpError ? error.status : error.name === "MulterError" || error.type === "entity.parse.failed" ? 400 : error.type === "entity.too.large" ? 413 : error.code === "P2025" ? 404 : 500;
  const message = status === 500 ? "Terjadi kesalahan pada server. Coba kembali." : error.name === "MulterError" ? "Unggahan tidak valid atau melebihi batas 5 MB per berkas." : error.message;
  if (status === 500) console.error(JSON.stringify({event:"request_failed",type:error.name,code:error.code}));
  res.status(status).json({success:false,error:message,errors:{general:message}});
});
