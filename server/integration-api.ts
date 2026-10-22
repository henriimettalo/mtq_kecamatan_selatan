import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import type { Request } from "express";
import type { Participant, Prisma } from "@prisma/client";
import { db } from "./db";
import { config } from "./config";
import { hash, idValue, HttpError, wire } from "./security";
import { getEvent, visibleParticipant } from "./events";
import { calculateAge } from "../shared/age";
import { maskNik, maskPhone, maskAccountNumber, maskAddress, maskBirthPlace, maskBirthDate } from "../shared/data-masking";
import { participantFile } from "./storage";
import { sendFileData } from "./files";
export const integrationApi = Router();
const allowed = (scopes: string[], scope: string) => scopes.includes("*") || scopes.includes(scope);
async function authorize(req: Request, scope: string) {
  const token = req.get("x-api-key")?.trim() || req.get("authorization")?.replace(/^Bearer\s+/i,"").trim();
  if (!token || token.length > 200) throw new HttpError(401,"Kunci API wajib disertakan.");
  const key = await db.apiKey.findUnique({where:{key_hash:hash(token)}});
  if (!key) throw new HttpError(401,"Kunci API tidak valid.");
  if (key.revoked_at) throw new HttpError(403,"Kunci API sudah dicabut.");
  const scopes = key.scopes.split(",");
  if (!allowed(scopes,scope)) throw new HttpError(403,"Hak akses kunci API tidak mencukupi.");
  await db.apiKey.update({where:{id:key.id},data:{last_used_at:new Date()}});
  return {...key,scopes};
}
integrationApi.use(rateLimit({windowMs:60000,limit:60,standardHeaders:"draft-8",legacyHeaders:false}));
function formatParticipant(p: Participant, event: Awaited<ReturnType<typeof getEvent>>, scopes: string[]) {
  const sensitive = allowed(scopes,"peserta:read_sensitive")||allowed(scopes,"peserta:pii");
  const documents = allowed(scopes,"peserta:read_documents");
  const branch = event.branches.find(b=>b.id===p.cabang);
  const calculated = calculateAge(p.tanggal_lahir,event.referenceDate);
  const document = (name: string|null, kind: string) => ({tersedia:Boolean(name),nama_berkas:documents?name:null,url:documents&&name?`${config.origin}/api/v1/peserta/${p.id}/dokumen/${kind}`:null});
  return {
    id:p.id,nik:sensitive?p.nik:maskNik(p.nik),nama:p.nama,jenis_kelamin:p.jenis_kelamin,
    alamat:sensitive?p.alamat:maskAddress(p.alamat),tempat_lahir:sensitive?p.tempat_lahir:maskBirthPlace(p.tempat_lahir),tanggal_lahir:sensitive?p.tanggal_lahir:maskBirthDate(p.tanggal_lahir),
    usia:{tahun:calculated.years,bulan:calculated.months,hari:calculated.days},
    nomor_whatsapp:sensitive?p.nomor_whatsapp:maskPhone(p.nomor_whatsapp),asal_sekolah:p.asal_sekolah,
    rekening:sensitive&&p.no_rekening?{nomor:p.no_rekening,nama_pemilik:p.nama_pemilik_rekening}:null,
    cabang:{id:p.cabang,nama:p.branch_name||branch?.name||p.cabang,kategori:branch?.description||null},
    status:p.status,rejection_reason:p.rejection_reason,
    dokumen:{kartu_keluarga:document(p.kk_filename,"kk"),ktp:document(p.ktp_filename,"ktp"),akta_kelahiran:document(p.akta_filename,"akta"),surat_pernyataan:document(p.surat_pernyataan_filename,"surat_pernyataan")},
    created_at:wire(p.created_at),
  };
}
integrationApi.get("/peserta",async(req,res) => {
  const auth = await authorize(req,"peserta:read");
  const event = await getEvent(typeof req.query.event === "string"?req.query.event:undefined);
  if (event.hideParticipantData) throw new HttpError(403,"Data peserta acara ini sedang disembunyikan.");
  const status = String(req.query.status||"all"), cabang = String(req.query.cabang||""), search = String(req.query.search||"").trim().slice(0,150);
  const page = Math.min(100000,Math.max(1,parseInt(String(req.query.page||1),10)||1)), limit = Math.min(200,Math.max(1,parseInt(String(req.query.limit||50),10)||50));
  const where: Prisma.ParticipantWhereInput = {event_id:event.id,
    ...(["approved","rejected","pending"].includes(status)?{status}:{}),...(cabang?{cabang}:{}),
    ...(search?{OR:[{nama:{contains:search}},{nik:{contains:search}},{nomor_whatsapp:{contains:search}}]}:{}),
  };
  const [rows,total,counts] = await Promise.all([
    db.participant.findMany({where,orderBy:[{created_at:"desc"},{id:"desc"}],take:limit,skip:(page-1)*limit}),
    db.participant.count({where}),db.participant.groupBy({by:["status"],where:{event_id:event.id},_count:{_all:true}}),
  ]);
  const summary: Record<string,number> = {total:0,approved:0,pending:0,rejected:0};
  for (const row of counts) {summary[row.status]=row._count._all;summary.total+=row._count._all;}
  res.json({success:true,event:{id:event.id,name:event.name,edition:event.edition,year:event.year,district:event.district,reference_date:event.referenceDate},summary,pagination:{page,limit,total_items:total,total_pages:Math.ceil(total/limit)||1},pii_masked:!allowed(auth.scopes,"peserta:read_sensitive")&&!allowed(auth.scopes,"peserta:pii"),documents_accessible:allowed(auth.scopes,"peserta:read_documents"),data:rows.map(p=>formatParticipant(p,event,auth.scopes))});
});
integrationApi.get("/peserta/:id",async(req,res) => {
  const auth = await authorize(req,"peserta:read");
  const {participant,event} = await visibleParticipant(idValue(req.params.id));
  const data = formatParticipant(participant,event,auth.scopes);
  res.json({success:true,pii_masked:!allowed(auth.scopes,"peserta:read_sensitive")&&!allowed(auth.scopes,"peserta:pii"),documents_accessible:allowed(auth.scopes,"peserta:read_documents"),data:{...data,event:{id:event.id,name:event.name,edition:event.edition,year:event.year,reference_date:event.referenceDate}}});
});
integrationApi.get("/peserta/:id/dokumen/:kind",async(req,res) => {
  await authorize(req,"peserta:read_documents");
  const {participant:p} = await visibleParticipant(idValue(req.params.id));
  const filename = ({kk:p.kk_filename,ktp:p.ktp_filename,akta:p.akta_filename,surat_pernyataan:p.surat_pernyataan_filename} as Record<string,string|null>)[String(req.params.kind)];
  if (!filename) throw new HttpError(404,"Dokumen tidak ditemukan.");
  sendFileData(res,await participantFile(filename),filename);
});
integrationApi.patch("/peserta/:id",async(req,res) => {
  const auth = await authorize(req,"peserta:write");
  const {participant:p} = await visibleParticipant(idValue(req.params.id));
  const status = req.body.status;
  if (!["pending","approved","rejected"].includes(status)) throw new HttpError(400,"Status harus pending, approved, atau rejected.");
  const rawReason = req.body.rejection_reason ?? req.body.catatan_revisi;
  const reason = status === "rejected" && typeof rawReason === "string" ? rawReason.trim() : null;
  if (status === "rejected" && (!reason || reason.length < 5 || reason.length > 500)) throw new HttpError(400,"Alasan penolakan wajib diisi, 5–500 karakter.");
  if (p.status===status && p.rejection_reason===reason) return res.json({success:true,data:{id:p.id,previous_status:p.status,status,rejection_reason:reason,idempotent:true}});
  await db.$transaction(async tx => {
    await tx.participant.update({where:{id:p.id},data:{status,rejection_reason:reason}});
    await tx.participantAudit.create({data:{participant_id:p.id,action:"STATUS_CHANGE",previous_status:p.status,new_status:status,rejection_reason:reason,actor:auth.name,actor_key_id:auth.id,ip_address:req.ip||"unknown",user_agent:req.get("user-agent")||"unknown"}});
  });
  res.json({success:true,data:{id:p.id,previous_status:p.status,status,rejection_reason:reason,updated_by:auth.name,audit_logged:true}});
});
