export type { AdminRole } from "./auth";
export interface ParticipantRecord {
  id: number; nama: string; nik?: string; jenis_kelamin?: string;
  nomor_whatsapp?: string; alamat?: string; tempat_lahir?: string;
  tanggal_lahir?: string; asal_sekolah?: string | null; cabang: string;
  branch_name: string | null; kk_filename?: string; ktp_filename?: string | null;
  akta_filename?: string; surat_pernyataan_filename?: string; event_id: string;
  event_settings: string; status: string; rejection_reason: string | null; created_at: string;
}
