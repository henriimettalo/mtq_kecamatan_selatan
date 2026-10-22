import { usePageData } from "@/lib/page-data";
import AdminTableClient from "@/components/AdminTableClient";
import { mergeEventSettings } from "@/lib/event-info";

import { setParticipantDataVisibility } from "@/lib/actions";
import Link from "@/lib/link";

export default function AdminPage() {
  const {event,events,participants,role}=usePageData();
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h2 className="text-[#2d2f36]" style={{ fontSize: "20px", fontWeight: 510 }}>
            Daftar Pendaftar — MTQ {event.edition} {event.year}
          </h2>
          <p className="text-[#8a8f98] mt-1" style={{ fontSize: "14px", fontWeight: 400 }}>
            {event.hideParticipantData ? "Data peserta untuk acara ini sedang disembunyikan." : `Total: ${participants.length} pendaftar`}
          </p>
        </div>
        {role === "admin" && (
          <form action={setParticipantDataVisibility}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="hidden" value={event.hideParticipantData ? "false" : "true"} />
            <button type="submit" className="rounded-md border border-[#cbd5cc] bg-white px-4 py-2 text-sm font-medium text-[#294333] hover:bg-[#f4f8f4]">
              {event.hideParticipantData ? "Tampilkan data peserta" : "Sembunyikan semua data peserta"}
            </button>
          </form>
        )}
      </div>
      {event.hideParticipantData && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          Data acara ini tidak ditampilkan. Arsip tetap tersimpan dan dapat ditampilkan kembali oleh admin.
        </div>
      )}
      <nav className="event-settings-events mb-6" aria-label="Pilih acara">{events.results.map((row:{id:string;settings:string})=>{const settings=mergeEventSettings(row.settings);return <Link key={row.id} href={`/admin?event=${row.id}`} aria-current={row.id===event.id?"page":undefined}>{settings.year} · {settings.district}</Link>;})}</nav>
      {!event.hideParticipantData && <AdminTableClient participants={participants as any} eventId={event.id} />}
    </div>
  );
}
