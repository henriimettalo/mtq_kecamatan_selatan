import { usePageData } from "@/lib/page-data";
import Link from "@/lib/link";
import { ApprovalActions } from "@/components/ApprovalActions";
import { DocumentGallery } from "@/components/DocumentGallery";



interface Participant {
  id: number;
  nik: string;
  nama: string;
  jenis_kelamin: string;
  nomor_whatsapp: string;
  alamat: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  asal_sekolah: string | null;
  no_rekening: string | null;
  nama_pemilik_rekening: string | null;
  cabang: string;
  branch_name: string | null;
  event_id: string;
  kk_filename: string;
  ktp_filename: string | null;
  akta_filename: string;
  surat_pernyataan_filename: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

function formatDate(dateString: string): string {
  // API dates are UTC without a suffix; append Z before formatting in WIB.
  const iso = dateString.includes("T")
    ? dateString.endsWith("Z") ? dateString : dateString + "Z"
    : dateString.replace(" ", "T") + "Z";
  const date = new Date(iso);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

function formatBirthDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

type StatusConfig = {
  label: string;
  bg: string;
  text: string;
};

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case "approved":
      return { label: "Disetujui", bg: "#e8f5e9", text: "#2e7d32" };
    case "rejected":
      return { label: "Ditolak", bg: "#fbe9e7", text: "#c62828" };
    default:
      return { label: "Menunggu", bg: "#fff3e0", text: "#e65100" };
  }
}

export default function ParticipantDetailPage() {
  const {role,event,participant}=usePageData();
  const updated=new URLSearchParams(window.location.search).get("updated");
  const branchName = participant.branch_name || event.branches.find(b=>b.id===participant.cabang)?.name || participant.cabang;
  const statusConfig = getStatusConfig(participant.status);

  const fileBaseUrl = `/admin/files/${participant.id}`;

  const dokumenFiles = [
    { label: "Kartu Keluarga", filename: participant.kk_filename },
    { label: "KTP", filename: participant.ktp_filename },
    { label: "Akta Lahir", filename: participant.akta_filename },
    { label: "Surat Pernyataan", filename: participant.surat_pernyataan_filename },
  ].filter((d): d is { label: string; filename: string } => Boolean(d.filename));

  const detailRows = [
    { label: "NIK", value: participant.nik },
    { label: "Nama Lengkap", value: participant.nama },
    { label: "Jenis Kelamin", value: participant.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan" },
    { label: "Nomor WhatsApp", value: participant.nomor_whatsapp },
    { label: "Alamat", value: participant.alamat },
    { label: "Tempat Lahir", value: participant.tempat_lahir },
    { label: "Tanggal Lahir", value: formatBirthDate(participant.tanggal_lahir) },
    { label: "Asal Sekolah", value: participant.asal_sekolah || "—" },
    { label: "No. Rekening", value: participant.no_rekening || "—" },
    { label: "Nama Pemilik Rekening", value: participant.nama_pemilik_rekening || "—" },
    { label: "Cabang", value: `${branchName} (${participant.cabang})` },
    { label: "Tanggal Daftar", value: formatDate(participant.created_at) },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin"
          className="text-text-tertiary hover:text-text-primary transition-colors"
          style={{ fontSize: "14px", fontWeight: 400 }}
        >
          ← Kembali
        </Link>
        <h2
          className="text-text-primary"
          style={{ fontSize: "20px", fontWeight: 510 }}
        >
          Detail Pendaftar
        </h2>
        <span
          style={{
            backgroundColor: statusConfig.bg,
            color: statusConfig.text,
            padding: "4px 12px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 510,
          }}
        >
          {statusConfig.label}
        </span>
        {updated === "approved" && (
          <span style={{ color: "#2e7d32", fontSize: "13px", fontWeight: 460 }}>
            ✓ Berhasil disetujui
          </span>
        )}
        {updated === "rejected" && (
          <span style={{ color: "#c62828", fontSize: "13px", fontWeight: 460 }}>
            ✓ Berhasil ditolak
          </span>
        )}
      </div>

      <div
        className="mb-8 p-6"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e6e6e6",
          borderRadius: "12px",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detailRows.map((row) => (
            <div key={row.label} className="flex flex-col">
              <span
                className="text-text-tertiary"
                style={{ fontSize: "12px", fontWeight: 400 }}
              >
                {row.label}
              </span>
              <span
                className="text-text-primary"
                style={{ fontSize: "14px", fontWeight: 510 }}
              >
                {row.label === "Nomor WhatsApp" ? (
                  <a
                    href={`https://wa.me/${participant.nomor_whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                    style={{ color: "#5e6ad2" }}
                  >
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h3
        className="text-text-primary mb-4"
        style={{ fontSize: "16px", fontWeight: 510 }}
      >
        Dokumen Persyaratan
      </h3>

      <DocumentGallery documents={dokumenFiles} fileBaseUrl={fileBaseUrl} />

      {role === "admin" && <ApprovalActions id={participant.id} currentStatus={participant.status} />}

      {participant.status === "rejected" && participant.rejection_reason && (
        <div
          className="mt-6 p-4"
          style={{
            backgroundColor: "#fbe9e7",
            border: "1px solid #ef9a9a",
            borderRadius: "12px",
          }}
        >
          <p style={{ fontSize: "13px", fontWeight: 510, color: "#c62828" }}>
            Alasan Penolakan:
          </p>
          <p style={{ fontSize: "14px", fontWeight: 400, color: "#424242" }}>
            {participant.rejection_reason}
          </p>
        </div>
      )}
    </div>
  );
}
