import { Router } from "express";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { config } from "./config";
import { hash, subjectFor, HttpError } from "./security";
import { createGoogleFlow, readGoogleFlow, verifyGoogleIdentity, OAUTH_COOKIE, PARTICIPANT_COOKIE, SESSION_SECONDS } from "../shared/google-oauth";
export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret, sessionSecret: config.sessionSecret, origin: config.origin } : null;
}
export const participantAuth = Router();
participantAuth.get("/auth/google", async (req, res) => {
  const settings = googleConfig();
  if (!settings) return res.redirect("/peserta/login?error=configuration");
  const flow = await createGoogleFlow(settings, String(req.query.next || ""));
  res.cookie(OAUTH_COOKIE, flow.cookie, { httpOnly:true, secure:config.secure, sameSite:"lax", path:"/api/auth/google", maxAge:600000 });
  res.redirect(flow.url.toString());
});
participantAuth.get("/auth/google/callback", async (req, res) => {
  const settings = googleConfig();
  const fail = () => { res.clearCookie(OAUTH_COOKIE, {path:"/api/auth/google"}); return res.redirect("/peserta/login?error=failed"); };
  if (!settings || typeof req.query.state !== "string" || typeof req.query.code !== "string" || !req.cookies[OAUTH_COOKIE] || req.query.error) return fail();
  try {
    const flow = await readGoogleFlow(req.cookies[OAUTH_COOKIE], req.query.state, settings);
    const result = await fetch("https://oauth2.googleapis.com/token", {
      method:"POST", signal:AbortSignal.timeout(10000), headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({code:req.query.code,client_id:settings.clientId,client_secret:settings.clientSecret,
        redirect_uri:`${config.origin}/api/auth/google/callback`,grant_type:"authorization_code",code_verifier:flow.verifier}),
    });
    if (!result.ok) return fail();
    const data = await result.json() as {id_token?:string};
    if (typeof data.id_token !== "string") return fail();
    const subject = await verifyGoogleIdentity(data.id_token, settings.clientId, flow.nonce);
    const old = req.cookies[PARTICIPANT_COOKIE], token = randomUUID(), now = Math.floor(Date.now()/1000);
    await db.$transaction(async tx => {
      await tx.participantSession.deleteMany({ where:{ OR:[{expires_at:{lte:now}}, ...(typeof old === "string" ? [{token_hash:hash(old)}] : [])] } });
      await tx.participantSession.create({data:{token_hash:hash(token),google_sub:subject,expires_at:now+SESSION_SECONDS}});
    });
    res.clearCookie(OAUTH_COOKIE,{path:"/api/auth/google"});
    res.cookie(PARTICIPANT_COOKIE,token,{httpOnly:true,secure:config.secure,sameSite:"lax",path:"/",maxAge:SESSION_SECONDS*1000});
    res.redirect(303,flow.returnTo);
  } catch { return fail(); }
});
participantAuth.post("/auth/logout", async (req, res) => {
  const token = req.cookies[PARTICIPANT_COOKIE];
  if (typeof token === "string") await db.participantSession.deleteMany({where:{token_hash:hash(token)}});
  res.clearCookie(PARTICIPANT_COOKIE,{path:"/"});
  res.redirect(303,"/peserta/login");
});
participantAuth.post("/peserta/claim", async (req,res) => {
  const subject = await subjectFor(req);
  if (!subject) throw new HttpError(401,"Silakan masuk terlebih dahulu.");
  let id = 0, token = "";
  try {
    if (typeof req.body.proofUrl !== "string" || req.body.proofUrl.length > 2048) throw new Error();
    const proof = new URL(req.body.proofUrl);
    if (proof.origin !== config.origin || proof.pathname !== "/sukses") throw new Error();
    id = Number(proof.searchParams.get("id")); token = proof.searchParams.get("token") || "";
    if (!Number.isSafeInteger(id) || id < 1 || !/^[a-f0-9-]{36}$/.test(token)) throw new Error();
  } catch { return res.redirect(303,"/peserta?claim=failed"); }
  const result = await db.participant.updateMany({where:{id,token,google_sub:null},data:{google_sub:subject}});
  res.redirect(303,`/peserta?claim=${result.count ? "success" : "failed"}`);
});
