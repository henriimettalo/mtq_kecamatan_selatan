import { db } from "./db";
import { eventInfo } from "../shared/event-info";
import { validateEventSettings } from "../shared/event-settings";
import { HttpError } from "./security";
export async function getEvent(id?: string) {
  const active = id ? null : await db.siteSettings.findUnique({ where: { id: 1 } });
  const row = await db.event.findUnique({ where: { id: id || active?.active_event_id || "" } });
  if (!row) throw new HttpError(404, "Acara tidak ditemukan.");
  return eventInfo(row);
}
export async function visibleParticipant(id: number) {
  const participant = await db.participant.findUnique({ where: { id } });
  if (!participant) throw new HttpError(404, "Peserta tidak ditemukan.");
  const event = await getEvent(participant.event_id);
  if (event.hideParticipantData) throw new HttpError(403, "Data peserta acara ini sedang disembunyikan.");
  return { participant, event };
}
export async function saveSettings(id: string, revision: number, input: unknown, action = "save") {
  let settings;
  try {settings = validateEventSettings(input);} catch(error) {throw new HttpError(400,(error as Error).message);}
  const after = JSON.stringify(settings);
  await db.$transaction(async tx => {
    const before = await tx.event.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Acara tidak ditemukan.");
    const result = await tx.event.updateMany({ where: { id, revision }, data: { settings: after, revision: { increment: 1 } } });
    if (!result.count) throw new HttpError(409, "Pengaturan berubah di tab lain. Muat ulang halaman.");
    await tx.eventAudit.create({ data: { event_id: id, action, actor: "admin", before_settings: before.settings, after_settings: after } });
  });
  return { revision: revision + 1 };
}
