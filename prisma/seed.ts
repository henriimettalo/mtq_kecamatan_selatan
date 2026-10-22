import "dotenv/config";
import { db } from "../server/db";
import { defaultEventSettings } from "../shared/event-settings";
try {
  await db.$transaction(async tx => {
    await tx.event.upsert({ where: { id: "legacy-2026" }, update: {}, create: {
      id: "legacy-2026", settings: JSON.stringify(defaultEventSettings),
    } });
    await tx.siteSettings.upsert({ where: { id: 1 }, update: {}, create: {
      id: 1, active_event_id: "legacy-2026",
    } });
  });
  console.log("Acara awal tersedia. Pengaturan yang sudah ada dipertahankan.");
} finally { await db.$disconnect(); }
