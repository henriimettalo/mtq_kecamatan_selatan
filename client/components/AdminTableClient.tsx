

import { useState, useMemo } from "react";
import { getBranchById } from "@shared/branches";
import { useAdminRole } from "@/lib/admin-role-context";
import Link from "@/lib/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
  branch_name?: string;
  kk_filename: string;
  ktp_filename: string | null;
  akta_filename: string;
  surat_pernyataan_filename: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

type SortKey = "nama" | "cabang" | "created_at";
type SortDir = "asc" | "desc";

interface Props {
  participants: Participant[];
  eventId: string;
}

function getStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case "approved":
      return { label: "Disetujui", bg: "#e8f5e9", text: "#2e7d32" };
    case "rejected":
      return { label: "Ditolak", bg: "#fbe9e7", text: "#c62828" };
    default:
      return { label: "Menunggu", bg: "#fff3e0", text: "#e65100" };
  }
}

function formatDate(dateString: string): string {
  // D1 stores UTC without Z suffix ("YYYY-MM-DD HH:MM:SS"); append Z so JS treats it as UTC
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

function getBranchName(branchId: string): string {
  const branch = getBranchById(branchId);
  return branch?.name || branchId;
}

export default function AdminTableClient({ participants, eventId }: Props) {
  const role = useAdminRole();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterJk, setFilterJk] = useState<"all" | "L" | "P">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "rejected" | "pending">("all");
  const [filterDate, setFilterDate] = useState("");

  const filtered = useMemo(() => {
    let data = [...participants];

    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.nama.toLowerCase().includes(q) ||
          p.nik.includes(q) ||
          p.nomor_whatsapp.includes(q)
      );
    }

    if (filterJk !== "all") {
      data = data.filter((p) => p.jenis_kelamin === filterJk);
    }

    if (filterStatus !== "all") {
      const target = filterStatus === "pending" ? "pending" : filterStatus;
      data = data.filter((p) => (p.status || "pending") === target);
    }

    if (filterDate) {
      data = data.filter((p) => {
        const raw = p.created_at;
        const iso = raw.includes("T")
          ? raw.endsWith("Z") ? raw : raw + "Z"
          : raw.replace(" ", "T") + "Z";
        const d = new Date(iso);
        const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const yyyy = wib.getUTCFullYear();
        const mm = String(wib.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(wib.getUTCDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "nama":
          cmp = a.nama.localeCompare(b.nama);
          break;
        case "cabang": {
          const ba = a.branch_name || getBranchById(a.cabang)?.name || a.cabang;
          const bb = b.branch_name || getBranchById(b.cabang)?.name || b.cabang;
          cmp = ba.localeCompare(bb);
          break;
        }
        case "created_at":
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [participants, search, sortKey, sortDir, filterJk, filterStatus, filterDate]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const headerBaseStyle = {
    fontSize: "14px",
    fontWeight: 510,
  } as React.CSSProperties;

  const cellBaseStyle = {
    fontSize: "14px",
    fontWeight: 400,
  } as React.CSSProperties;

  return (
    <div>
      {/* Search & Count */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Cari nama, NIK, atau WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-md border border-[#d0d6e0] bg-white px-3 text-sm text-[#2d2f36] placeholder:text-[#8a8f98] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2] w-full max-w-sm"
          />
          <select
            value={filterJk}
            onChange={(e) => setFilterJk(e.target.value as any)}
            className="h-9 rounded-md border border-[#d0d6e0] bg-white px-2 text-sm text-[#2d2f36] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
          >
            <option value="all">Semua L/P</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-9 rounded-md border border-[#d0d6e0] bg-white px-2 text-sm text-[#2d2f36] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="h-9 rounded-md border border-[#d0d6e0] bg-white px-2 text-sm text-[#2d2f36] focus:outline-none focus:ring-1 focus:ring-[#5e6ad2]"
            title="Filter tanggal daftar"
          />
          <span className="text-sm text-[#8a8f98]">
            {filtered.length} peserta
          </span>
        </div>
        {role === "admin" && (
          <Link href={`/admin/export?event=${encodeURIComponent(eventId)}`}>
            <Button
              variant="ghost"
              className="text-[#6c6f7b] hover:text-[#2d2f36] hover:bg-[#f3f4f5]"
              style={{
                fontSize: "14px",
                fontWeight: 510,
                backgroundColor: "#ffffff",
                border: "1px solid #d0d6e0",
                borderRadius: "6px",
              }}
            >
              Export CSV
            </Button>
          </Link>
        )}
      </div>

      <div
        className="rounded-panel overflow-hidden"
        style={{
          border: "1px solid #e6e6e6",
          borderRadius: "12px",
        }}
      >
        <Table>
          <TableHeader>
            <TableRow
              style={{
                backgroundColor: "#f3f4f5",
                borderBottom: "1px solid #e6e6e6",
              }}
            >
              <TableHead className="text-[#2d2f36]" style={headerBaseStyle}>
                NIK
              </TableHead>
              <TableHead
                className="text-[#2d2f36] cursor-pointer select-none"
                style={headerBaseStyle}
                onClick={() => toggleSort("nama")}
              >
                Nama{sortIndicator("nama")}
              </TableHead>
              <TableHead className="text-[#2d2f36]" style={headerBaseStyle}>
                L/P
              </TableHead>
              <TableHead
                className="text-[#2d2f36] cursor-pointer select-none"
                style={headerBaseStyle}
                onClick={() => toggleSort("cabang")}
              >
                Cabang{sortIndicator("cabang")}
              </TableHead>
              <TableHead className="text-[#2d2f36]" style={headerBaseStyle}>
                Dokumen
              </TableHead>
              <TableHead className="text-[#2d2f36]" style={headerBaseStyle}>
                Status
              </TableHead>
              <TableHead
                className="text-[#2d2f36] cursor-pointer select-none"
                style={headerBaseStyle}
                onClick={() => toggleSort("created_at")}
              >
                Tanggal Daftar{sortIndicator("created_at")}
              </TableHead>
              <TableHead className="text-[#2d2f36]" style={headerBaseStyle}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-[#8a8f98] py-8"
                  style={cellBaseStyle}
                >
                  {search.trim() ? "Tidak ada peserta yang cocok" : "Belum ada pendaftar"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((participant, index) => {
                const dokumenCount = [
                  participant.kk_filename,
                  participant.ktp_filename,
                  participant.akta_filename,
                  participant.surat_pernyataan_filename,
                ].filter((f): f is string => Boolean(f) && f !== "").length;

                const badge = getStatusBadge(participant.status);

                return (
                  <TableRow
                    key={participant.id}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "transparent",
                      borderBottom: "1px solid #e6e6e6",
                    }}
                  >
                    <TableCell
                      className="text-[#6c6f7b] font-mono"
                      style={cellBaseStyle}
                    >
                      {participant.nik}
                    </TableCell>
                    <TableCell
                      className="text-[#6c6f7b]"
                      style={cellBaseStyle}
                    >
                      {participant.nama}
                    </TableCell>
                    <TableCell
                      className="text-[#6c6f7b]"
                      style={cellBaseStyle}
                    >
                      {participant.jenis_kelamin === "L" ? "L" : "P"}
                    </TableCell>
                    <TableCell
                      className="text-[#6c6f7b]"
                      style={cellBaseStyle}
                    >
                      {participant.branch_name || getBranchName(participant.cabang)}
                    </TableCell>
                    <TableCell style={cellBaseStyle}>
                      <span
                        style={{
                          backgroundColor: dokumenCount === 4 ? "#e8f5e9" : "#fff3e0",
                          color: dokumenCount === 4 ? "#2e7d32" : "#e65100",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 510,
                        }}
                      >
                        {dokumenCount}/4 file
                      </span>
                    </TableCell>
                    <TableCell style={cellBaseStyle}>
                      <span
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 510,
                        }}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-[#6c6f7b]"
                      style={cellBaseStyle}
                    >
                      {formatDate(participant.created_at)}
                    </TableCell>
                    <TableCell style={cellBaseStyle}>
                      <Link
                        href={`/admin/${participant.id}`}
                        className="hover:underline"
                        style={{ color: "#5e6ad2", fontWeight: 510 }}
                      >
                        Lihat Detail →
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
