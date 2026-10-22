

import { useState } from "react";
import type { ParticipantRecord } from "@shared/types";
import type { EventSettings } from "@shared/event-settings";
import { maskNik } from "@shared/data-masking";

interface ParticipantRecordCardProps {
  record: ParticipantRecord;
  settings: EventSettings;
  branchTitle: string;
  formattedDate: string;
  defaultExpanded?: boolean;
}

export function ParticipantRecordCard({
  record,
  settings,
  branchTitle,
  formattedDate,
  defaultExpanded = false,
}: ParticipantRecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isPending = record.status === "pending";
  const isApproved = record.status === "approved";
  const isRejected = record.status === "rejected";

  return (
    <article
      className={`mtq-account-record ${isExpanded ? "mtq-account-record-open" : "mtq-account-record-collapsed"}`}
    >
      {/* Kartu Ringkasan (Header yang Selalu Terlihat Saat Di-minimize) */}
      <div
        className="mtq-record-clickable-header"
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        aria-expanded={isExpanded}
      >
        {/* Baris Meta Atas: Tanggal Pendaftaran & ID */}
        <div className="mtq-record-top">
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "var(--mtq-muted)",
                fontWeight: 500,
              }}
            >
              Tanggal pendaftaran: {formattedDate}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="mtq-record-id-badge">ID #{record.id}</span>
          </div>
        </div>

        {/* Baris Utama: Cabang Lomba & Nama Peserta sejajar, Status Verifikasi, & Tombol Toggle */}
        <div className="mtq-record-summary-row">
          <div className="mtq-record-summary-left">
            <span className="mtq-record-branch-badge">{branchTitle}</span>
            <h2 className="mtq-record-name">{record.nama}</h2>
          </div>

          <div className="mtq-record-summary-right">
            {/* Status Verifikasi Badge */}
            <span
              className={`mtq-record-status-pill ${
                isApproved
                  ? "mtq-status-pill-approved"
                  : isRejected
                  ? "mtq-status-pill-rejected"
                  : "mtq-status-pill-pending"
              }`}
            >
              <span>{isApproved ? "✅" : isRejected ? "❌" : "⏳"}</span>
              <span>
                {isApproved
                  ? "Disetujui"
                  : isRejected
                  ? "Ditolak"
                  : "Menunggu Verifikasi"}
              </span>
            </span>

            {/* Tombol Minimize / Expand */}
            <button
              type="button"
              className="mtq-record-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              title={isExpanded ? "Sembunyikan rincian" : "Tampilkan rincian"}
            >
              <span>{isExpanded ? "Sembunyikan" : "Lihat Rincian"}</span>
              <span className="mtq-toggle-icon">{isExpanded ? "▲" : "▼"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Rincian Lengkap (Tampil Ketika Di-expand) */}
      {isExpanded && (
        <div className="mtq-record-expanded-content">
          {/* Status Banner & Stepper */}
          <div
            className={`mtq-record-status-card ${
              isApproved
                ? "mtq-status-card-approved"
                : isRejected
                ? "mtq-status-card-rejected"
                : "mtq-status-card-pending"
            }`}
          >
            <div className="mtq-status-card-header">
              <span>{isApproved ? "✅" : isRejected ? "❌" : "⏳"}</span>
              <span>
                {isApproved
                  ? "Pendaftaran Disetujui"
                  : isRejected
                  ? "Pendaftaran Ditolak / Perlu Perbaikan"
                  : "Menunggu Verifikasi Panitia"}
              </span>
            </div>

            <p className="mtq-status-card-desc">
              {isApproved
                ? "Selamat! Berkas dan data pendaftaran Anda telah dinyatakan lengkap dan memenuhi syarat untuk mengikuti musabaqah."
                : isRejected
                ? record.rejection_reason
                  ? `Catatan Panitia: ${record.rejection_reason}`
                  : "Pendaftaran Anda belum memenuhi persyaratan yang ditentukan. Silakan hubungi panitia jika membutuhkan klarifikasi."
                : "Berkas pendaftaran Anda telah berhasil diterima oleh sistem dan sedang dalam antrean verifikasi oleh tim verifikator panitia. Silakan pantau halaman ini secara berkala."}
            </p>

            {/* Progress Stepper */}
            <div className="mtq-stepper">
              <div className="mtq-step-item mtq-step-done">
                <span className="mtq-step-circle">✓</span>
                <span>1. Pendaftaran Terkirim</span>
              </div>
              <div
                className={`mtq-step-item ${
                  isApproved || isRejected ? "mtq-step-done" : "mtq-step-active"
                }`}
              >
                <span className="mtq-step-circle">
                  {isApproved || isRejected ? "✓" : "2"}
                </span>
                <span>2. Verifikasi Berkas</span>
              </div>
              <div
                className={`mtq-step-item ${
                  isApproved
                    ? "mtq-step-done"
                    : isRejected
                    ? "mtq-step-done"
                    : "mtq-step-todo"
                }`}
              >
                <span className="mtq-step-circle">
                  {isApproved ? "✓" : isRejected ? "✕" : "3"}
                </span>
                <span>
                  3.{" "}
                  {isApproved
                    ? "Resmi Terdaftar"
                    : isRejected
                    ? "Ditolak"
                    : "Penetapan"}
                </span>
              </div>
            </div>
          </div>

          {/* Rincian Biodata Peserta */}
          <h3 className="mtq-record-section-title">Rincian Biodata Peserta</h3>
          <div className="mtq-record-grid">
            {record.nik && (
              <div className="mtq-record-field">
                <label>Nomor Induk Kependudukan (NIK)</label>
                <span>{maskNik(record.nik)}</span>
              </div>
            )}
            {record.jenis_kelamin && (
              <div className="mtq-record-field">
                <label>Jenis Kelamin</label>
                <span>
                  {record.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                </span>
              </div>
            )}
            {(record.tempat_lahir || record.tanggal_lahir) && (
              <div className="mtq-record-field">
                <label>Tempat, Tanggal Lahir</label>
                <span>
                  {record.tempat_lahir ? `${record.tempat_lahir}, ` : ""}
                  {record.tanggal_lahir}
                </span>
              </div>
            )}
            {record.nomor_whatsapp && (
              <div className="mtq-record-field">
                <label>Nomor WhatsApp</label>
                <span>{record.nomor_whatsapp}</span>
              </div>
            )}
            <div className="mtq-record-field">
              <label>Asal Sekolah / Utusan Lembaga</label>
              <span>{record.asal_sekolah || "Utusan Mandiri / Perorangan"}</span>
            </div>
            {record.alamat && (
              <div className="mtq-record-field">
                <label>Alamat Domisili</label>
                <span>{record.alamat}</span>
              </div>
            )}
          </div>

          {/* Dokumen Persyaratan */}
          <h3 className="mtq-record-section-title">
            Dokumen Persyaratan yang Diunggah
          </h3>
          <div className="mtq-docs-grid">
            <div className="mtq-doc-item">
              <span>📄</span>
              <span>
                Kartu Keluarga: <strong>Terunggah</strong>
              </span>
            </div>
            <div className="mtq-doc-item">
              <span>📄</span>
              <span>
                Akta Kelahiran: <strong>Terunggah</strong>
              </span>
            </div>
            <div className="mtq-doc-item">
              <span>📝</span>
              <span>
                Surat Pernyataan: <strong>Terunggah</strong>
              </span>
            </div>
            <div className="mtq-doc-item">
              <span>🪪</span>
              <span>
                KTP:{" "}
                <strong>
                  {record.ktp_filename ? "Terunggah" : "Tidak Diperlukan"}
                </strong>
              </span>
            </div>
          </div>

          {/* Informasi Jadwal & Lokasi Pelaksanaan */}
          {(settings.schedule ||
            settings.venue ||
            settings.contact ||
            settings.announcement) && (
            <div className="mtq-event-notice-box">
              <strong>Informasi Pelaksanaan & Panitia:</strong>
              {settings.schedule && (
                <p style={{ margin: 0 }}>
                  📅 <strong>Jadwal Lomba:</strong> {settings.schedule}
                </p>
              )}
              {settings.venue && (
                <p style={{ margin: 0 }}>
                  📍 <strong>Lokasi Lomba:</strong> {settings.venue}
                </p>
              )}
              {settings.contact && (
                <p style={{ margin: 0 }}>
                  📞 <strong>Kontak Panitia:</strong> {settings.contact}
                </p>
              )}
              {settings.announcement && (
                <p style={{ margin: "4px 0 0 0", color: "#92400e" }}>
                  📢 <em>{settings.announcement}</em>
                </p>
              )}
            </div>
          )}

          {/* Tombol Tutup / Sembunyikan di Bagian Bawah */}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              className="mtq-record-toggle-btn"
              onClick={() => setIsExpanded(false)}
            >
              <span>Sembunyikan Rincian</span>
              <span>▲</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
