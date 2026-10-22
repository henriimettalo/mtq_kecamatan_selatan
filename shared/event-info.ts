import { defaultEventSettings, eventIsOpen, type EventSettings } from "./event-settings";
export function mergeEventSettings(json: string): EventSettings {
  return { ...defaultEventSettings, ...JSON.parse(json) };
}
export function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal belum tersedia" : new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Pontianak",
  }).format(date);
}
export function formatEventDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal belum tersedia" : new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Pontianak",
  }).format(date) + " WIB";
}
export function eventInfo(row: {id: string; settings: string; revision: number}) {
  const settings = mergeEventSettings(row.settings);
  return { ...settings, id: row.id, revision: row.revision, isOpen: eventIsOpen(settings) };
}
