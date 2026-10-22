import { Router } from "express";
import { db } from "./db";
import { requireRole, idValue, HttpError } from "./security";
import { visibleParticipant, getEvent } from "./events";
import { participantFile } from "./storage";
import type { Response } from "express";
export function sendFileData(res: Response, file: {body:Buffer;type:string}|null, filename: string) {
  if (!file) throw new HttpError(404,"Berkas tidak ditemukan.");
  res.set({"Content-Type":file.type,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(filename)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"});
  res.send(file.body);
}
export const files = Router();
files.get("/files/:id/:filename",async(req,res) => {
  await requireRole(req);
  const {participant} = await visibleParticipant(idValue(req.params.id));
  const filename = String(req.params.filename);
  if (![participant.kk_filename,participant.ktp_filename,participant.akta_filename,participant.surat_pernyataan_filename].includes(filename)) throw new HttpError(404,"Berkas tidak ditemukan.");
  sendFileData(res,await participantFile(filename),filename);
});
function csv(value: unknown) {
  let text = value == null ? "" : String(value);
  // Spreadsheet programs must treat participant input as text, never as a formula.
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"','""')}"`;
}
files.get("/export",async(req,res) => {
  await requireRole(req,true);
  const event = await getEvent(typeof req.query.event === "string"?req.query.event:undefined);
  if (event.hideParticipantData) throw new HttpError(403,"Data peserta acara ini sedang disembunyikan.");
  const rows = await db.participant.findMany({where:{event_id:event.id},orderBy:{created_at:"desc"}});
  const headers = ["NIK","Nama","Jenis Kelamin","Nomor WhatsApp","Alamat","Tempat Lahir","Tanggal Lahir","Asal Sekolah","No Rekening","Nama Pemilik Rekening","Cabang","Surat Pernyataan","Status","Alasan Penolakan","Tanggal Daftar"];
  const data = rows.map(p=>[p.nik,p.nama,p.jenis_kelamin==="L"?"Laki-laki":"Perempuan",p.nomor_whatsapp,p.alamat,p.tempat_lahir,p.tanggal_lahir,p.asal_sekolah,p.no_rekening,p.nama_pemilik_rekening,p.branch_name||event.branches.find(b=>b.id===p.cabang)?.name||p.cabang,p.surat_pernyataan_filename,({approved:"Disetujui",pending:"Menunggu",rejected:"Ditolak"} as Record<string,string>)[p.status],p.rejection_reason,new Intl.DateTimeFormat("id-ID",{dateStyle:"short",timeStyle:"short",timeZone:"Asia/Pontianak"}).format(p.created_at)]);
  res.set({"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="pendaftar-mtq-${event.year}.csv"`});
  res.send("\uFEFF"+[headers,...data].map(row=>row.map(csv).join(",")).join("\n"));
});
