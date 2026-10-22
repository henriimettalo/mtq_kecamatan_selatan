import { Router } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { db } from "./db";
import { config } from "./config";
import { requireRole, verifyPassword, loginCookie, hash, idValue, HttpError, wire } from "./security";
import { AUTH_COOKIE_NAME } from "../shared/auth";
import { cloneEvent, validateEventSettings } from "../shared/event-settings";
import { getEvent, saveSettings, visibleParticipant } from "./events";
import { safePath, validateFile } from "./storage";
export const admin = Router();
admin.post("/login", rateLimit({windowMs:15*60000,limit:15,standardHeaders:"draft-8",legacyHeaders:false}), async(req,res) => {
  const {username,password} = req.body;
  const role = username === config.adminUsername && verifyPassword(password,config.adminHash) ? "admin"
    : username === config.viewerUsername && verifyPassword(password,config.viewerHash) ? "viewer" : null;
  if (!role) return res.status(401).json({error:"Username atau password salah."});
  await loginCookie(res,role);
  res.json({success:true,redirect:"/admin"});
});
admin.post("/logout", (_req,res) => {
  res.clearCookie(AUTH_COOKIE_NAME,{path:"/"}); res.json({redirect:"/admin/login"});
});
admin.use(async(req,_res,next) => { await requireRole(req,true); next(); });
admin.patch("/participants/:id/status", async(req,res) => {
  const {participant} = await visibleParticipant(idValue(req.params.id));
  const status = req.body.status;
  if (!["pending","approved","rejected"].includes(status)) throw new HttpError(400,"Status tidak valid.");
  const reason = status === "rejected" && typeof req.body.rejectionReason === "string" ? req.body.rejectionReason.trim() : null;
  if (status === "rejected" && (!reason || reason.length < 5 || reason.length > 500)) throw new HttpError(400,"Alasan penolakan harus 5–500 karakter.");
  await db.$transaction(async tx => {
    await tx.participant.update({where:{id:participant.id},data:{status,rejection_reason:reason}});
    await tx.participantAudit.create({data:{participant_id:participant.id,action:"STATUS_CHANGE",previous_status:participant.status,new_status:status,rejection_reason:reason,actor:"admin",ip_address:req.ip||"unknown",user_agent:req.get("user-agent")||"unknown"}});
  });
  res.json({redirect:`/admin/${participant.id}?updated=${status}`});
});
admin.put("/events/:id", async(req,res) => {
  if (!Number.isSafeInteger(req.body.revision) || req.body.revision < 1) throw new HttpError(400,"Revisi tidak valid.");
  res.json(await saveSettings(String(req.params.id),req.body.revision,req.body.settings));
});
admin.post("/events/:id/visibility", async(req,res) => {
  if (typeof req.body.hidden !== "boolean") throw new HttpError(400,"Status visibilitas tidak valid.");
  const event = await getEvent(String(req.params.id));
  res.json(await saveSettings(event.id,event.revision,{...event,hideParticipantData:req.body.hidden},req.body.hidden?"hide_participants":"show_participants"));
});
admin.post("/events/:id/copy", async(req,res) => {
  const source = await getEvent(String(req.params.id));
  const settings = validateEventSettings(cloneEvent(source,req.body.year));
  const id = randomUUID();
  await db.$transaction(async tx => {
    await tx.event.create({data:{id,settings:JSON.stringify(settings)}});
    await tx.eventAudit.create({data:{event_id:id,action:"copy",actor:"admin",after_settings:JSON.stringify(settings)}});
  });
  res.json({id});
});
admin.post("/events/:id/activate", async(req,res) => {
  const event = await getEvent(String(req.params.id));
  await db.$transaction(async tx => {
    const before = await tx.siteSettings.findUniqueOrThrow({where:{id:1}});
    await tx.siteSettings.update({where:{id:1},data:{active_event_id:event.id}});
    await tx.eventAudit.create({data:{event_id:event.id,action:"activate",actor:"admin",before_settings:before.active_event_id,after_settings:event.id}});
  });
  res.json({success:true});
});
const scopesAllowed = ["peserta:read","peserta:read_sensitive","peserta:read_documents","peserta:write","peserta:pii"];
function newKey(name: string, scopes: string) {
  const rawKey = `mtq_live_${randomBytes(24).toString("hex")}`;
  return { rawKey, data:{name,key_prefix:`${rawKey.slice(0,17)}...`,key_hash:hash(rawKey),scopes,created_by:"admin"} };
}
admin.get("/api-keys", async(_req,res) => {
  const keys = await db.apiKey.findMany({orderBy:[{created_at:"desc"},{id:"desc"}]});
  res.json(wire(keys.map(({key_hash,...key})=>key)));
});
admin.post("/api-keys", async(req,res) => {
  const {name,scopes} = req.body;
  if (typeof name !== "string" || !name.trim() || name.length > 150 || !Array.isArray(scopes) || !scopes.length || scopes.some(s=>!scopesAllowed.includes(s))) throw new HttpError(400,"Nama dan hak akses kunci API tidak valid.");
  const key = newKey(name.trim(),[...new Set(scopes)].join(","));
  const record = await db.apiKey.create({data:key.data});
  res.json({success:true,id:record.id,rawKey:key.rawKey,name:key.data.name,keyPrefix:key.data.key_prefix,scopes});
});
admin.post("/api-keys/:id/rotate", async(req,res) => {
  const result = await db.$transaction(async tx => {
    const old = await tx.apiKey.findUnique({where:{id:idValue(req.params.id)}});
    if (!old) throw new HttpError(404,"Kunci API tidak ditemukan.");
    if (old.revoked_at) throw new HttpError(409,"Kunci API sudah dicabut.");
    const name = `${old.name.slice(0,130)} (Rotated)`;
    const key = newKey(name,old.scopes);
    await tx.apiKey.update({where:{id:old.id},data:{revoked_at:new Date()}});
    const record = await tx.apiKey.create({data:key.data});
    return {success:true,id:record.id,rawKey:key.rawKey,name,keyPrefix:key.data.key_prefix,scopes:old.scopes.split(",")};
  }); res.json(result);
});
admin.post("/api-keys/:id/revoke", async(req,res) => {
  await db.apiKey.update({where:{id:idValue(req.params.id)},data:{revoked_at:new Date()}}); res.json({success:true});
});
admin.delete("/api-keys/:id", async(req,res) => {
  await db.apiKey.delete({where:{id:idValue(req.params.id)}}); res.json({success:true});
});
export const eventAssetUpload = [
  async(req: any,_res: any,next: any) => { await requireRole(req,true); next(); },
  multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:2}}).single("file"),
  async(req: any,res: any) => {
    const file = req.file as Express.Multer.File|undefined;
    const ext = file ? extname(file.originalname).toLowerCase() : "";
    if (req.body.kind === "template") {
      if (ext !== ".pdf") throw new HttpError(400,"Template harus berupa PDF.");
      validateFile(file);
    } else if (ext === ".webp") {
      if (!file || !file.size || file.mimetype !== "image/webp" || file.buffer.subarray(0,4).toString() !== "RIFF" || file.buffer.subarray(8,12).toString() !== "WEBP") throw new HttpError(400,"Logo WebP tidak valid.");
    } else {
      if (![".png",".jpg",".jpeg"].includes(ext)) throw new HttpError(400,"Logo harus PNG, JPG, atau WebP.");
      validateFile(file);
    }
    const key = `${randomUUID()}${ext}`;
    await mkdir(config.assetDir,{recursive:true,mode:0o700});
    await writeFile(safePath(config.assetDir,key),file!.buffer,{mode:0o600,flag:"wx"});
    res.json({url:`/api/event-assets/${key}`});
  },
];
