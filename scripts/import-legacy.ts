import "dotenv/config";
import { readFile } from "node:fs/promises";
import { db } from "../server/db";
import { defaultEventSettings } from "../shared/event-settings";
const file=process.argv[2];
if (!file) throw new Error("Gunakan: npx tsx scripts/import-legacy.ts /private/path/legacy.json (atau - untuk stdin)");
let text="";
if (file === "-") {for await (const chunk of process.stdin) text+=chunk.toString();}
else text=await readFile(file,"utf8");
const source=JSON.parse(text);
const date=(value:any)=>value?new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value)?value:String(value).replace(" ","T")+"Z"):new Date();
try {
  if (await db.participant.count() || await db.apiKey.count()) throw new Error("Impor hanya ke database tujuan tanpa peserta/kunci API. Gunakan database baru untuk mencegah penimpaan.");
  await db.$transaction(async tx=>{
    if (!(source.events||[]).length) source.events=[{id:"legacy-2026",settings:JSON.stringify(defaultEventSettings),revision:1}];
    for (const row of source.events) await tx.event.upsert({where:{id:row.id},update:{settings:row.settings,revision:row.revision||1},create:{id:row.id,settings:row.settings,revision:row.revision||1,created_at:date(row.created_at),updated_at:date(row.updated_at)}});
    const active=source.site_settings?.[0]?.active_event_id||source.events[0].id;
    await tx.siteSettings.upsert({where:{id:1},update:{active_event_id:active},create:{id:1,active_event_id:active}});
    for (const row of source.participants||[]) {
      const data:any={};
      for (const key of ["id","nik","nama","nomor_whatsapp","jenis_kelamin","alamat","tempat_lahir","tanggal_lahir","asal_sekolah","no_rekening","nama_pemilik_rekening","cabang","kk_filename","ktp_filename","akta_filename","surat_pernyataan_filename","status","rejection_reason","token","google_sub","branch_name"]) if (row[key]!==undefined) data[key]=row[key];
      data.event_id=row.event_id||"legacy-2026";data.created_at=date(row.created_at);
      await tx.participant.create({data});
    }
    for (const row of source.api_keys||[]) await tx.apiKey.create({data:{id:row.id,name:row.name,key_prefix:row.key_prefix,key_hash:row.key_hash,scopes:row.scopes,created_by:row.created_by||"admin",created_at:date(row.created_at),last_used_at:row.last_used_at?date(row.last_used_at):null,revoked_at:row.revoked_at?date(row.revoked_at):null}});
    for (const row of source.event_settings_audit||[]) await tx.eventAudit.create({data:{id:row.id,event_id:row.event_id,action:row.action,actor:row.actor,before_settings:row.before_settings,after_settings:row.after_settings,created_at:date(row.created_at)}});
    for (const row of source.participant_audit_logs||[]) await tx.participantAudit.create({data:{id:row.id,participant_id:row.participant_id,action:row.action,previous_status:row.previous_status,new_status:row.new_status,rejection_reason:row.rejection_reason,actor:row.actor,actor_key_id:row.actor_key_id,ip_address:row.ip_address||"unknown",user_agent:row.user_agent||"unknown",created_at:date(row.created_at)}});
  },{timeout:120000});
  console.log(`Impor selesai: ${(source.participants||[]).length} peserta. Sesi login lama tidak diimpor; peserta perlu masuk kembali.`);
} finally {await db.$disconnect();}
