import { usePageData } from "@/lib/page-data";
import Link from "@/lib/link";

import { mergeEventSettings } from "@/lib/event-info";
import { EventSettingsForm } from "@/components/EventSettingsForm";
export default function SettingsPage() {
  const {event,active,events,audit}=usePageData();
  const labels: Record<string,string> = {save:"Pengaturan disimpan",copy:"Acara disalin",activate:"Acara diaktifkan",hide_participants:"Data peserta disembunyikan",show_participants:"Data peserta ditampilkan kembali"};
  return <div>
    <h2 className="text-xl mb-2">Pengaturan Acara</h2>
    <p className="mb-5">Ubah informasi tanpa mengedit kode. Perubahan tersimpan setelah pratinjau dan simpan.</p>
    <nav className="event-settings-events" aria-label="Pilih acara">
      {events.results.map((row:{id:string;settings:string})=>{const settings=mergeEventSettings(row.settings);return <Link key={row.id} aria-current={row.id===event.id?"page":undefined} href={`/admin/pengaturan?event=${row.id}`}>MTQ {settings.edition} {settings.year}{row.id===active.id?" · Aktif":""}</Link>;})}
    </nav>
    <EventSettingsForm key={event.id} initial={event} eventId={event.id} revision={event.revision} active={event.id===active.id} audit={audit.results} />
  </div>;
}
