import { usePageData } from "@/lib/page-data";
import Link from "@/lib/link";
import { formatEventDate, mergeEventSettings } from "@/lib/event-info";

import { ParticipantRecordList } from "@/components/ParticipantRecordList";


export default function ParticipantPage() {
  const {event,records}=usePageData();
  const params=Object.fromEntries(new URLSearchParams(window.location.search));
  const preparedItems = records.map((record) => {
    const settings = mergeEventSettings(record.event_settings);
    const branchTitle = record.branch_name || settings.branches.find(b => b.id === record.cabang)?.name || record.cabang;
    const formattedDate = formatEventDate(record.created_at.replace(" ", "T") + "Z");

    return {
      record,
      settings,
      branchTitle,
      formattedDate,
    };
  });

  return <>
    <div className="mtq-account-heading">
      <div>
        <p className="mtq-eyebrow">Akun Peserta · MTQ {event.edition} Tahun {event.year}</p>
        <h1>Pendaftaran <em>saya.</em></h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--mtq-muted)" }}>
          {event.district} ({event.region}) — Pantau status verifikasi berkas, rincian data peserta, dan jadwal pelaksanaan MTQ Anda.
        </p>
      </div>
      <form action="/api/auth/logout" method="post">
        <button className="mtq-button" type="submit">Keluar</button>
      </form>
    </div>

    {event.hideParticipantData ? (
      <p className="mtq-account-notice" role="status">
        Data peserta MTQ {event.year} sudah disembunyikan oleh panitia. Arsip pendaftaran tetap tersimpan.
      </p>
    ) : null}

    {!event.hideParticipantData && params.claim && (
      <p className="mtq-account-notice" role="status">
        {params.claim === "success"
          ? "✅ Pendaftaran berhasil dihubungkan ke akun Anda."
          : "⚠️ Pendaftaran belum dapat dihubungkan. Periksa ID dan token bukti pendaftaran. Data yang sudah terhubung ke akun lain tidak dapat diklaim kembali."}
      </p>
    )}

    {!event.hideParticipantData && records.length === 0 ? (
      <div className="mtq-account-empty">
        <h2>Belum ada pendaftaran.</h2>
        <p>Anda belum memiliki pendaftaran aktif di akun ini. Daftarkan diri Anda sekarang atau hubungkan bukti pendaftaran sebelumnya.</p>
        {event.isOpen ? (
          <Link href="/daftar" className="mtq-button mtq-button-primary">Daftar peserta sekarang</Link>
        ) : (
          <p>Pendaftaran saat ini ditutup. Anda tetap dapat menghubungkan pendaftaran sebelumnya di bawah.</p>
        )}
      </div>
    ) : null}
    {!event.hideParticipantData && records.length > 0 ? (
      <ParticipantRecordList items={preparedItems} isOpen={event.isOpen} />
    ) : null}

    {/* Form claim untuk pendaftaran lama (accordion tertutup) */}
    {!event.hideParticipantData && <details className="mtq-claim" style={{ marginTop: "48px" }}>
      <summary style={{ cursor: "pointer", color: "var(--mtq-muted)", fontSize: "13px" }}>
        Bantuan: Hubungkan pendaftaran sebelumnya secara manual
      </summary>
      <p style={{ fontSize: "13px", color: "var(--mtq-muted)" }}>
        Jika Anda pernah mendaftar sebelum login Google di perangkat lain, Anda dapat menempelkan tautan bukti pendaftaran untuk menghubungkannya ke akun ini.
      </p>
      <form action="/api/peserta/claim" method="post">
        <label htmlFor="claim-proof">
          Tautan bukti pendaftaran
          <input id="claim-proof" name="proofUrl" type="url" autoComplete="off" maxLength={2048} required />
        </label>
        <button type="submit" className="mtq-button mtq-button-primary">Hubungkan pendaftaran</button>
      </form>
    </details>}
  </>;
}
