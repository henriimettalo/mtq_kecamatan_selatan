import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { setupTestEnvironment } from "./test-environment";
test("Express + Prisma + MySQL workflows",{skip:!process.env.TEST_DATABASE_URL},async t=>{
  setupTestEnvironment();
  const {db}=await import("../server/db");
  const {app}=await import("../server/app");
  const {defaultEventSettings}=await import("../shared/event-settings");
  const {hash}=await import("../server/security");
  await db.$transaction([db.participantAudit.deleteMany(),db.participantSession.deleteMany(),db.apiKey.deleteMany(),db.participant.deleteMany(),db.eventAudit.deleteMany(),db.siteSettings.deleteMany(),db.event.deleteMany()]);
  const settings={...defaultEventSettings,registrationMode:"open" as const};
  await db.event.create({data:{id:"legacy-2026",settings:JSON.stringify(settings)}});
  await db.siteSettings.create({data:{id:1,active_event_id:"legacy-2026"}});
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  const origin="http://localhost:33317";
  async function call(path:string,method="GET",body?:unknown,cookie="",key="") {
    const response=await fetch(base+path,{method,redirect:"manual",headers:{...(body instanceof FormData?{}:body===undefined?{}:{"Content-Type":"application/json"}),Origin:origin,...(cookie?{Cookie:cookie}:{}),...(key?{"X-API-Key":key}:{})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
    const type=response.headers.get("content-type")||"";
    return {response,data:type.includes("application/json")?await response.json():await response.text()};
  }
  let admin="",viewer="",id=0,token="",readKey="",writeKey="",documentKey="";
  const form=()=>{
    const f=new FormData();for(const [k,v] of Object.entries({nama:"Peserta Uji VPS",nik:"6171010101900001",jenisKelamin:"L",nomorWhatsApp:"081234567890",alamat:"Alamat data uji",tempatLahir:"Pontianak",tanggalLahir:"1990-01-01",cabang:"tilawah-dewasa",eventId:"legacy-2026"}))f.set(k,v);
    for(const name of ["kkFile","ktpFile","aktaFile","suratPernyataanFile"])f.set(name,new Blob(["%PDF-1.4\n%%EOF"],{type:"application/pdf"}),"uji.pdf");return f;
  };
  try {
    await t.test("health, origin protection and unauthenticated access",async()=>{
      assert.equal((await call("/api/health")).response.status,200);
      assert.equal((await call("/api/page?page=admin")).response.status,401);
      assert.equal((await fetch(base+"/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"})).status,403);
      assert.equal((await call("/api/admin/login","POST",{username:"admin",password:"wrong"})).response.status,401);
    });
    await t.test("admin and viewer login, cookie flags and role enforcement",async()=>{
      for(const [user,password] of [["admin","mtq-test-admin"],["viewer","mtq-test-viewer"]]){
        const result=await call("/api/admin/login","POST",{username:user,password});assert.equal(result.response.status,200);
        const cookie=result.response.headers.get("set-cookie")!;assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);
        if(user==="admin")admin=cookie.split(";")[0];else viewer=cookie.split(";")[0];
      }
      assert.equal((await call("/api/admin/api-keys","POST",{name:"blocked",scopes:["peserta:read"]},viewer)).response.status,403);
      assert.equal((await call("/api/page?page=settings","GET",undefined,viewer)).data.redirect,"/admin");
    });
    await t.test("registration validates content and concurrent uploads have distinct directories",async()=>{
      const invalid=form();invalid.set("kkFile",new Blob(["fake pdf"],{type:"application/pdf"}),"uji.pdf");
      assert.equal((await call("/api/register","POST",invalid)).response.status,400);
      const registered=await Promise.all([call("/api/register","POST",form()),call("/api/register","POST",form())]);
      for(const r of registered)assert.equal(r.response.status,200,JSON.stringify(r.data));
      const proof=new URL(registered[0].data.redirectUrl,origin);id=Number(proof.searchParams.get("id"));token=proof.searchParams.get("token")!;
      const rows=await db.participant.findMany();assert.equal(rows.length,2);assert.notEqual(rows[0].kk_filename,rows[1].kk_filename);
      assert.equal((await call(`/api/page?page=success&id=${id}&token=wrong`)).data.redirect,"/daftar");
      assert.equal((await call(`/api/page?page=success&id=${id}&token=${token}`)).data.participant.nama,"Peserta Uji VPS");
      const list=await call("/api/page?page=admin","GET",undefined,admin);assert.equal(list.data.participants.length,2);assert.equal(list.data.participants[0].token,undefined);
    });
    await t.test("private documents, status changes, audit and CSV export",async()=>{
      const p=await db.participant.findUniqueOrThrow({where:{id}});
      const file=`/admin/files/${id}/${encodeURIComponent(p.kk_filename)}`;
      assert.equal((await call(file)).response.status,401);
      assert.equal((await call(file,"GET",undefined,viewer)).response.status,200);
      assert.equal((await call(`/api/admin/participants/${id}/status`,"PATCH",{status:"approved"},viewer)).response.status,403);
      assert.equal((await call(`/api/admin/participants/${id}/status`,"PATCH",{status:"approved"},admin)).response.status,200);
      assert.equal(await db.participantAudit.count(),1);
      assert.equal((await call("/admin/export","GET",undefined,viewer)).response.status,403);
      const csv=await call("/admin/export","GET",undefined,admin);assert.match(csv.data,/Peserta Uji VPS/);
    });
    await t.test("event assets preserve supported formats and reject non-image logos",async()=>{
      const asset=new FormData();asset.set("kind","template");asset.set("file",new Blob(["%PDF-1.4\n%%EOF"],{type:"application/pdf"}),"template.pdf");
      assert.equal((await call("/api/event-assets","POST",asset,viewer)).response.status,403);
      const uploaded=await call("/api/event-assets","POST",asset,admin);assert.equal(uploaded.response.status,200);
      assert.equal((await call(uploaded.data.url)).response.status,200);
      asset.set("kind","logo");assert.equal((await call("/api/event-assets","POST",asset,admin)).response.status,400);
    });
    await t.test("API keys enforce scopes, masking, rotation and revocation",async()=>{
      for(const [name,scopes] of [["read",["peserta:read"]],["write",["peserta:write"]],["documents",["peserta:read_documents"]]] as const){
        const r=await call("/api/admin/api-keys","POST",{name,scopes},admin);assert.equal(r.response.status,200);assert.ok(Number.isInteger(r.data.id));
        if(name==="read")readKey=r.data.rawKey;else if(name==="write")writeKey=r.data.rawKey;else documentKey=r.data.rawKey;
      }
      const read=await call("/api/v1/peserta","GET",undefined,"",readKey);assert.equal(read.data.pii_masked,true);assert.notEqual(read.data.data[0].nik,"6171010101900001");assert.equal(read.data.data[0].dokumen.kartu_keluarga.url,null);
      assert.equal((await call(`/api/v1/peserta/${id}/dokumen/kk`,"GET",undefined,"",readKey)).response.status,403);
      assert.equal((await call(`/api/v1/peserta/${id}/dokumen/kk`,"GET",undefined,"",documentKey)).response.status,200);
      assert.equal((await call(`/api/v1/peserta/${id}`,"PATCH",{status:"rejected",rejection_reason:"Dokumen belum lengkap"},"",writeKey)).response.status,200);
      const key=await db.apiKey.findUniqueOrThrow({where:{key_hash:hash(readKey)}});
      const rotated=await call(`/api/admin/api-keys/${key.id}/rotate`,"POST",{},admin);assert.equal(rotated.response.status,200);
      assert.equal((await call("/api/v1/peserta","GET",undefined,"",readKey)).response.status,403);readKey=rotated.data.rawKey;
      assert.equal((await call("/api/v1/peserta","GET",undefined,"",readKey)).response.status,200);
    });
    await t.test("visibility blocks every participant path and stale settings cannot overwrite",async()=>{
      const before=(await call("/api/page?page=settings","GET",undefined,admin)).data.event;
      assert.equal((await call("/api/admin/events/legacy-2026/visibility","POST",{hidden:true},admin)).response.status,200);
      assert.equal((await call(`/api/page?page=detail&id=${id}`,"GET",undefined,admin)).response.status,403);
      assert.equal((await call("/admin/export","GET",undefined,admin)).response.status,403);
      assert.equal((await call("/api/v1/peserta","GET",undefined,"",readKey)).response.status,403);
      const proof=await call(`/api/page?page=success&id=${id}&token=${token}`);assert.equal(proof.data.hidden,true);assert.equal(proof.data.participant,null);
      assert.equal((await call("/api/admin/events/legacy-2026","PUT",{revision:before.revision,settings:before},admin)).response.status,409);
      assert.equal((await call("/api/admin/events/legacy-2026/visibility","POST",{hidden:false},admin)).response.status,200);
    });
    await t.test("participant claim is atomic, sessions are local, event copy and activation work",async()=>{
      const sessions=[randomUUID(),randomUUID()];
      for(let i=0;i<2;i++)await db.participantSession.create({data:{token_hash:hash(sessions[i]),google_sub:`test-subject-${i}`,expires_at:Math.floor(Date.now()/1000)+600}});
      const requests=sessions.map(s=>call("/api/peserta/claim","POST",{proofUrl:`${origin}/sukses?id=${id}&token=${token}`},`mtq_participant_session=${s}`));
      const claimed=await Promise.all(requests);assert.equal(claimed.filter(r=>r.response.headers.get("location")==="/peserta?claim=success").length,1);
      const copied=await call("/api/admin/events/legacy-2026/copy","POST",{year:2027},admin);assert.ok(copied.data.id);
      assert.equal((await call(`/api/admin/events/${copied.data.id}/activate`,"POST",{},admin)).response.status,200);
      assert.equal((await call("/api/page?page=home")).data.event.year,2027);
      assert.equal((await call("/api/page?page=register")).data.redirect,"/ditutup");
      // Leave the test server fixture usable for the browser smoke check.
      await call("/api/admin/events/legacy-2026/activate","POST",{},admin);
    });
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await db.$disconnect();}
});
