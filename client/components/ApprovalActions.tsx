

import { useTransition, useRef, useState } from "react";
import { updateParticipantStatus } from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function ApprovalActions({ id, currentStatus }: { id: number; currentStatus: string }) {
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // State Dialog Konfirmasi Kustom
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  function executeApprove() {
    setConfirmApproveOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateParticipantStatus(id, "approved");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menyetujui");
      }
    });
  }

  function executeResetPending() {
    setConfirmResetOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateParticipantStatus(id, "pending");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal mengubah status");
      }
    });
  }

  function handleReject() {
    setError(null);
    const reason = reasonRef.current?.value?.trim();
    startTransition(async () => {
      try {
        await updateParticipantStatus(id, "rejected", reason || undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menolak");
      }
    });
  }

  return (
    <div
      className="mt-6 p-6"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e6e6e6",
        borderRadius: "12px",
      }}
    >
      <h3
        className="text-text-primary mb-3"
        style={{ fontSize: "16px", fontWeight: 510 }}
      >
        Verifikasi & Persetujuan
      </h3>

      {/* Status Info Banner */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {currentStatus === "approved" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 510,
              backgroundColor: "#e8f5e9",
              color: "#2e7d32",
              border: "1px solid #a5d6a7",
            }}
          >
            ✓ Status: Disetujui
          </span>
        ) : currentStatus === "rejected" ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 510,
              backgroundColor: "#fbe9e7",
              color: "#c62828",
              border: "1px solid #ffcdd2",
            }}
          >
            ✕ Status: Ditolak
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 510,
              backgroundColor: "#fff3e0",
              color: "#e65100",
              border: "1px solid #ffe0b2",
            }}
          >
            ⏳ Status: Menunggu Verifikasi
          </span>
        )}
        <span style={{ fontSize: "13px", color: "#62666d" }}>
          {currentStatus === "approved"
            ? "Pendaftaran ini telah disetujui. Anda dapat mengubah statusnya jika diperlukan."
            : currentStatus === "rejected"
            ? "Pendaftaran ini berstatus ditolak. Anda dapat mengubah statusnya jika diperlukan."
            : "Silakan periksa kelengkapan data dan dokumen, lalu tentukan tindakan."}
        </span>
      </div>

      {error && (
        <p style={{ color: "#c62828", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {!showRejectForm ? (
        <div className="flex gap-3 flex-wrap items-center">
          {/* Tombol Setujui HANYA muncul jika BELUM disetujui */}
          {currentStatus !== "approved" && (
            <button
              onClick={() => setConfirmApproveOpen(true)}
              disabled={isPending}
              style={{
                backgroundColor: "#2e7d32",
                color: "#ffffff",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 510,
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending
                ? "Memproses…"
                : currentStatus === "rejected"
                ? "✓ Ubah ke Disetujui"
                : "✓ Setujui"}
            </button>
          )}

          {/* Tombol Tolak HANYA muncul jika BELUM ditolak */}
          {currentStatus !== "rejected" && (
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={isPending}
              style={{
                backgroundColor: currentStatus === "approved" ? "transparent" : "#c62828",
                color: currentStatus === "approved" ? "#c62828" : "#ffffff",
                border: currentStatus === "approved" ? "1px solid #c62828" : "none",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 510,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {currentStatus === "approved" ? "✕ Ubah ke Ditolak" : "✕ Tolak"}
            </button>
          )}

          {/* Tombol Kembalikan ke Menunggu Verifikasi jika status sudah approved atau rejected */}
          {currentStatus !== "pending" && (
            <button
              onClick={() => setConfirmResetOpen(true)}
              disabled={isPending}
              style={{
                backgroundColor: "transparent",
                color: "#62666d",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 460,
                border: "1px solid #d0d6e0",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Memproses…" : "↺ Kembalikan ke Menunggu"}
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: "8px" }}>
          <label
            className="text-text-secondary block mb-2"
            style={{ fontSize: "13px", fontWeight: 460 }}
          >
            Alasan Penolakan (wajib, 5–500 karakter)
          </label>
          <textarea
            ref={reasonRef}
            rows={3}
            placeholder="Masukkan alasan penolakan untuk catatan peserta..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d0d6e0",
              fontSize: "14px",
              fontWeight: 400,
              resize: "vertical",
              backgroundColor: "#ffffff",
            }}
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleReject}
              disabled={isPending}
              style={{
                backgroundColor: "#c62828",
                color: "#ffffff",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 510,
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Memproses…" : "Konfirmasi Tolak"}
            </button>
            <button
              onClick={() => setShowRejectForm(false)}
              disabled={isPending}
              style={{
                backgroundColor: "transparent",
                color: "#62666d",
                padding: "8px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 460,
                border: "1px solid #d0d6e0",
                cursor: "pointer",
              }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Alert Dialog Konfirmasi Setujui */}
      <ConfirmDialog
        isOpen={confirmApproveOpen}
        title="Setujui Pendaftaran Peserta?"
        message="Pastikan biodata pendaftar, kesesuaian cabang lomba, dan berkas lampiran telah diperiksa.\n\nPeserta ini akan resmi berstatus Disetujui (Approved)."
        confirmLabel="Ya, Setujui"
        cancelLabel="Batal"
        variant="success"
        isLoading={isPending}
        onConfirm={executeApprove}
        onCancel={() => setConfirmApproveOpen(false)}
      />

      {/* Alert Dialog Konfirmasi Kembalikan Status */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Kembalikan ke Status Menunggu?"
        message="Status pendaftaran peserta ini akan dikembalikan menjadi 'Menunggu Verifikasi'.\n\nAnda dapat meninjau ulang berkas atau memperbarui keputusan nanti."
        confirmLabel="Ya, Kembalikan ke Menunggu"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isPending}
        onConfirm={executeResetPending}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}