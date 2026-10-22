import { branches, type BranchDefinition } from "./branches";
export interface EventSettings {
  name: string; edition: string; year: number; district: string; organizer: string; region: string;
  opensAt: string; deadline: string; referenceDate: string; registrationMode: "auto" | "open" | "closed" | "postponed";
  hideParticipantData: boolean;
  heroText: string; announcement: string; schedule: string; venue: string; contact: string;
  logo: string; districtLogo: string; organizerLogo: string; statementTemplate: string;
  branches: BranchDefinition[];
}
// Seed values preserve the existing event. Later events are configured in MySQL.
export const defaultEventSettings: EventSettings = {
  name: "Musabaqah Tilawatil Qur’an", edition: "XXXIV", year: 2026, district: "Kecamatan Pontianak Selatan",
  organizer: "LPTQ", region: "Kota Pontianak, Kalimantan Barat", opensAt: "", deadline: "2026-06-01T23:59:59+07:00", referenceDate: "2026-07-01",
  registrationMode: "auto", hideParticipantData: false, heroText: "Ruang untuk merawat kecintaan pada Al-Qur’an, mengembangkan kemampuan, dan mempererat kebersamaan.",
  announcement: "", schedule: "", venue: "", contact: "",
  logo: "/images/seal-pontianak.png", districtLogo: "/images/logo-pontianak-selatan.png", organizerLogo: "/images/logo-lptq.jpeg",
  statementTemplate: "/templates/surat-pernyataan-komitmen-mtq-2026.pdf", branches,
};
export function eventIsOpen(settings: EventSettings, now = Date.now()) {
  if (settings.hideParticipantData || settings.registrationMode === "closed" || settings.registrationMode === "postponed") return false;
  if (settings.registrationMode === "open") return true;
  return (!settings.opensAt || now >= Date.parse(settings.opensAt)) && (!settings.deadline || now <= Date.parse(settings.deadline));
}
export function validateEventSettings(input: unknown): EventSettings {
  if (!input || typeof input !== "object") throw new Error("Pengaturan tidak valid.");
  const value = input as Record<string, unknown>;
  const result = { ...defaultEventSettings };
  for (const key of ["name", "edition", "district", "organizer", "region", "opensAt", "deadline", "referenceDate", "heroText", "announcement", "schedule", "venue", "contact", "logo", "districtLogo", "organizerLogo", "statementTemplate"] as const) {
    if (typeof value[key] !== "string" || (value[key] as string).length > 4000) throw new Error(`Isian ${key} tidak valid.`);
    result[key] = (value[key] as string).trim();
  }
  if (!result.name || !result.district || !result.referenceDate) throw new Error("Nama acara, wilayah, dan acuan usia wajib diisi.");
  if (result.name.length > 150 || result.district.length > 150 || result.edition.length > 20 || result.organizer.length > 150 || result.region.length > 150) throw new Error("Nama acara/wilayah maksimal 150 karakter dan nomor MTQ maksimal 20 karakter.");
  if (!Number.isInteger(value.year) || Number(value.year) < 2000 || Number(value.year) > 2200) throw new Error("Tahun harus antara 2000 dan 2200.");
  result.year = Number(value.year);
  if (!["auto", "open", "closed", "postponed"].includes(String(value.registrationMode))) throw new Error("Status pendaftaran tidak valid.");
  result.registrationMode = value.registrationMode as EventSettings["registrationMode"];
  if (value.hideParticipantData !== undefined && typeof value.hideParticipantData !== "boolean") throw new Error("Status penyembunyian data peserta tidak valid.");
  result.hideParticipantData = value.hideParticipantData === true;
  for (const date of [result.opensAt, result.deadline, result.referenceDate]) {
    if (!date) continue;
    const day = date.slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(date)) || new Date(`${day}T00:00:00Z`).toISOString().slice(0,10) !== day) throw new Error("Tanggal tidak valid.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.referenceDate)) throw new Error("Acuan usia harus berupa tanggal.");
  for (const key of ["opensAt","deadline"] as const) {
    // Legacy date-only configuration represented midnight UTC, equivalent to 07:00 WIB.
    if (/^\d{4}-\d{2}-\d{2}$/.test(result[key])) result[key] += "T07:00:00+07:00";
    if (result[key] && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/.test(result[key])) throw new Error("Tanggal pendaftaran harus menggunakan waktu WIB.");
  }
  if (result.opensAt && result.deadline && Date.parse(result.opensAt) >= Date.parse(result.deadline)) throw new Error("Tanggal tutup harus setelah tanggal buka.");
  for (const key of ["logo", "districtLogo", "organizerLogo", "statementTemplate"] as const) if (!/^\/(images|templates|api\/event-assets)\/[a-zA-Z0-9/_.-]+$/.test(result[key])) throw new Error("Berkas harus berasal dari unggahan aplikasi.");
  if (!Array.isArray(value.branches) || value.branches.length < 1 || value.branches.length > 60) throw new Error("Acara harus memiliki 1–60 cabang.");
  const ids = new Set<string>();
  result.branches = value.branches.map(raw => {
    if (!raw || typeof raw !== "object") throw new Error("Cabang tidak valid.");
    const b = raw as Record<string, unknown>;
    if (typeof b.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(b.id) || ids.has(b.id)) throw new Error("Kode cabang harus unik.");
    ids.add(b.id);
    if (typeof b.name !== "string" || !b.name.trim() || b.name.length > 150 || typeof b.description !== "string" || b.description.length > 500) throw new Error("Nama/keterangan cabang tidak valid.");
    const branch: BranchDefinition = { id: b.id, name: b.name.trim(), description: b.description.trim() };
    for (const key of ["minAgeYears", "maxAgeYears", "maxAgeMonths", "maxAgeDays"] as const) {
      const max = key === "maxAgeMonths" ? 11 : key === "maxAgeDays" ? 30 : 120;
      if (b[key] !== undefined) {
        if (!Number.isInteger(b[key]) || Number(b[key]) < 0 || Number(b[key]) > max) throw new Error("Batas usia cabang tidak valid.");
        branch[key] = Number(b[key]);
      }
    }
    if (branch.minAgeYears !== undefined && branch.maxAgeYears !== undefined && branch.minAgeYears > branch.maxAgeYears) throw new Error("Usia minimum melebihi maksimum.");
    return branch;
  });
  return result;
}
export function cloneEvent(settings: EventSettings, year: number): EventSettings {
  return { ...settings, year, opensAt: "", deadline: "", referenceDate: `${year}-07-01`, registrationMode: "closed", hideParticipantData: false, schedule: "", venue: "", announcement: "", branches: settings.branches.map(b => ({ ...b })) };
}
