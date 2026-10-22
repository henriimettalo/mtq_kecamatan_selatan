import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db } from "./db";
import { getEvent } from "./events";
import { googleConfig } from "./participant-auth";
import { subjectFor, HttpError } from "./security";
import { validateNIK, validateWhatsApp, validateJenisKelamin, normalizeWhatsApp } from "../shared/validation";
import { isEligible } from "../shared/branches";
import { calculateAge } from "../shared/age";
import { validateFile, saveDocument, removeFolder } from "./storage";
export const registration = Router();
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:4,fields:20,fieldSize:8000,parts:24}});
registration.post("/", rateLimit({windowMs:60000,limit:10,standardHeaders:"draft-8",legacyHeaders:false}), upload.fields([
  {name:"kkFile",maxCount:1},{name:"ktpFile",maxCount:1},{name:"aktaFile",maxCount:1},{name:"suratPernyataanFile",maxCount:1},
]), async (req,res) => {
  const event = await getEvent(), subject = await subjectFor(req);
  if (googleConfig() && !subject) throw new HttpError(401,"Silakan masuk dengan Google sebelum mendaftar.");
  if (!event.isOpen) throw new HttpError(400,"Pendaftaran tidak dibuka.");
  if (req.body.eventId !== event.id) throw new HttpError(409,"Acara berubah. Muat ulang formulir.");
  const errors: Record<string,string> = {};
  const limits: Record<string,number> = {nama:150,nik:16,jenisKelamin:1,nomorWhatsApp:20,alamat:4000,tempatLahir:150,tanggalLahir:10,cabang:80};
  for (const [key,max] of Object.entries(limits)) {
    if (typeof req.body[key] !== "string" || !req.body[key].trim() || req.body[key].length > max) errors[key] = `Isian wajib diisi dan maksimal ${max} karakter.`;
  }
  for (const [key,max] of Object.entries({asalSekolah:255,noRekening:80,namaPemilikRekening:150})) {
    if (req.body[key] !== undefined && (typeof req.body[key] !== "string" || req.body[key].length > max)) errors[key] = `Maksimal ${max} karakter.`;
  }
  if (Object.keys(errors).length) return res.status(400).json({success:false,errors});
  const b = req.body as Record<string,string>;
  for (const [key,result] of [["nik",validateNIK(b.nik)],["jenisKelamin",validateJenisKelamin(b.jenisKelamin)],["nomorWhatsApp",validateWhatsApp(b.nomorWhatsApp)]] as const) {
    if (!result.valid) errors[key] = result.error || "Isian tidak valid.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.tanggalLahir) || !Number.isFinite(Date.parse(b.tanggalLahir)) || new Date(b.tanggalLahir).toISOString().slice(0,10) !== b.tanggalLahir || b.tanggalLahir > new Date().toISOString().slice(0,10)) errors.tanggalLahir = "Tanggal lahir tidak valid.";
  if (!errors.tanggalLahir && !isEligible(b.cabang,b.tanggalLahir,event.referenceDate,event.branches).eligible) errors.cabang = "Usia tidak memenuhi syarat cabang.";
  const files = req.files as Record<string,Express.Multer.File[]>;
  for (const key of ["kkFile","ktpFile","aktaFile","suratPernyataanFile"]) {
    try { validateFile(files?.[key]?.[0],key === "suratPernyataanFile"); } catch(error) { errors[key] = (error as Error).message; }
  }
  if (Object.keys(errors).length) return res.status(400).json({success:false,errors});
  // A random directory prevents concurrent registrations from overwriting each other's documents.
  const folder = `${b.nik}-${randomUUID()}`;
  try {
    const kk_filename = await saveDocument(files.kkFile[0],folder,"KK");
    const ktp_filename = await saveDocument(files.ktpFile[0],folder,calculateAge(b.tanggalLahir,event.referenceDate).years < 17 ? "KK Pengganti" : "KTP");
    const akta_filename = await saveDocument(files.aktaFile[0],folder,"Akta Lahir");
    const surat_pernyataan_filename = await saveDocument(files.suratPernyataanFile[0],folder,"Surat Pernyataan");
    const token = randomUUID();
    const participant = await db.participant.create({data:{nik:b.nik,nama:b.nama.trim(),jenis_kelamin:b.jenisKelamin,nomor_whatsapp:normalizeWhatsApp(b.nomorWhatsApp),alamat:b.alamat.trim(),tempat_lahir:b.tempatLahir.trim(),tanggal_lahir:b.tanggalLahir,asal_sekolah:b.asalSekolah||null,no_rekening:b.noRekening||null,nama_pemilik_rekening:b.namaPemilikRekening||null,cabang:b.cabang,kk_filename,ktp_filename,akta_filename,surat_pernyataan_filename,token,event_id:event.id,branch_name:event.branches.find(x=>x.id===b.cabang)!.name,google_sub:subject}});
    res.json({success:true,redirectUrl:`/sukses?id=${participant.id}&token=${token}`});
  } catch(error) { await removeFolder(folder); throw error; }
});
