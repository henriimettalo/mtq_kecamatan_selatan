import { Router } from "express";
import { db } from "./db";
import { getEvent, visibleParticipant } from "./events";
import { requireRole, roleFor, subjectFor, HttpError, idValue, wire } from "./security";
import { googleConfig } from "./participant-auth";
export const pages = Router();
pages.get("/", async (req, res) => {
  const page = String(req.query.page || "home");
  const eventId = typeof req.query.event === "string" ? req.query.event : undefined;
  const event = await getEvent();
  const redirect = (path: string) => res.json({ redirect: path });
  if (page === "closed" && event.isOpen) return redirect("/");
  if (["home", "closed"].includes(page)) return res.json({ event });
  if (page === "register") {
    if (!event.isOpen) return redirect("/ditutup");
    if (googleConfig() && !await subjectFor(req)) return redirect("/peserta/login?next=%2Fdaftar");
    return res.json({ event });
  }
  if (page === "participant-login") {
    if (await subjectFor(req)) return redirect(req.query.next === "/daftar" ? "/daftar" : "/peserta");
    return res.json({ event, googleEnabled: Boolean(googleConfig()) });
  }
  if (page === "participant") {
    const subject = await subjectFor(req);
    if (!subject) return redirect("/peserta/login");
    const rows = event.hideParticipantData ? [] : await db.participant.findMany({
      where: { google_sub: subject, event_id: event.id }, include: { event: true }, orderBy: [{created_at:"desc"},{id:"desc"}],
    });
    const records = rows.map(({event: rowEvent, token, google_sub, no_rekening, nama_pemilik_rekening, ...row}) => ({ ...row, event_settings: rowEvent.settings }));
    return res.json(wire({ event, records }));
  }
  if (page === "success") {
    const token = req.query.token;
    if (typeof token !== "string" || !req.query.id) return redirect("/daftar");
    const participant = await db.participant.findFirst({ where: { id: idValue(req.query.id), token }, select: {
      id:true, nama:true, nik:true, nomor_whatsapp:true, cabang:true, event_id:true, branch_name:true,
    } });
    if (!participant) return redirect("/daftar");
    const participantEvent = await getEvent(participant.event_id);
    const hidden = participantEvent.hideParticipantData || event.id !== participant.event_id;
    return res.json({ event: participantEvent, hidden, participant: hidden ? null : participant });
  }
  const role = await requireRole(req);
  if (page === "detail") {
    const { participant, event: detailEvent } = await visibleParticipant(idValue(req.query.id));
    const { token, google_sub, ...safeParticipant } = participant;
    return res.json(wire({ role, participant: safeParticipant, event: detailEvent }));
  }
  if (!["admin", "settings", "api-keys"].includes(page)) throw new HttpError(404, "Halaman tidak ditemukan.");
  if (page !== "admin" && role !== "admin") return redirect("/admin");
  if (page === "api-keys") {
    const keys = await db.apiKey.findMany({ orderBy: [{created_at:"desc"},{id:"desc"}] });
    return res.json(wire({ role, keys: keys.map(({ key_hash, ...key }) => key) }));
  }
  const selected = eventId ? await getEvent(eventId) : event;
  const events = await db.event.findMany({ select: { id: true, settings: true }, orderBy: [{created_at:"desc"},{id:"desc"}] });
  if (page === "settings") {
    const audit = await db.eventAudit.findMany({ where:{event_id:selected.id}, select:{id:true,action:true,actor:true,created_at:true}, orderBy:{id:"desc"}, take:20 });
    return res.json(wire({ role, event: selected, active: event, events: { results: events }, audit: { results: audit } }));
  }
  const rows = selected.hideParticipantData ? [] : await db.participant.findMany({ where: {event_id:selected.id}, orderBy: [{created_at:"desc"},{id:"desc"}] });
  const participants = rows.map(({token, google_sub, ...row}) => ({ ...row, branch_name: row.branch_name || selected.branches.find(b=>b.id===row.cabang)?.name || row.cabang }));
  return res.json(wire({ role, event: selected, events: { results: events }, participants }));
});
