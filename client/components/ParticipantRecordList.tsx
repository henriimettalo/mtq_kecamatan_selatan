

import { useState, useMemo } from "react";
import Link from "@/lib/link";
import type { ParticipantRecord } from "@shared/types";
import type { EventSettings } from "@shared/event-settings";
import { ParticipantRecordCard } from "@/components/ParticipantRecordCard";

export interface PreparedParticipantItem {
  record: ParticipantRecord;
  settings: EventSettings;
  branchTitle: string;
  formattedDate: string;
}

interface ParticipantRecordListProps {
  items: PreparedParticipantItem[];
  isOpen: boolean;
}

type FilterStatus = "all" | "approved" | "pending" | "rejected";

export function ParticipantRecordList({ items, isOpen }: ParticipantRecordListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Hitung jumlah pendaftar per status
  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    for (const item of items) {
      if (item.record.status === "approved") approved++;
      else if (item.record.status === "rejected") rejected++;
      else pending++; // default pending
    }

    return {
      all: items.length,
      approved,
      pending,
      rejected,
    };
  }, [items]);

  // Ekstrak daftar cabang unik yang terdaftar pada akun ini
  const availableBranches = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of items) {
      const key = item.record.cabang;
      const title = item.branchTitle || key;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { id: key, name: title, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Saring pendaftar berdasarkan status dan cabang lomba
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Filter Status
      if (filterStatus === "approved" && item.record.status !== "approved") return false;
      if (
        filterStatus === "pending" &&
        item.record.status &&
        item.record.status !== "pending"
      ) {
        return false;
      }
      if (filterStatus === "rejected" && item.record.status !== "rejected") return false;

      // 2. Filter Cabang Lomba
      if (selectedBranch !== "all" && item.record.cabang !== selectedBranch) {
        return false;
      }

      return true;
    });
  }, [items, filterStatus, selectedBranch]);

  const hasActiveFilter = filterStatus !== "all" || selectedBranch !== "all";

  const resetFilters = () => {
    setFilterStatus("all");
    setSelectedBranch("all");
  };

  return (
    <div>
      {/* Panel Filter Terpadu: Status & Cabang Lomba */}
      <div
        className="mtq-filters-toolbar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          margin: "24px 0 20px",
          padding: "12px 16px",
          backgroundColor: "#ffffff",
          border: "1px solid #e7e4dc",
          borderRadius: "8px",
        }}
      >
        {/* Filter Status (Pill Tabs) */}
        <div
          role="tablist"
          aria-label="Filter status verifikasi"
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--mtq-ink, #253828)",
              marginRight: "2px",
            }}
          >
            Status:
          </span>

          {/* Tab Semua */}
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "9999px",
              fontSize: "12.5px",
              fontWeight: filterStatus === "all" ? 600 : 500,
              cursor: "pointer",
              transition: "all 160ms ease",
              border: filterStatus === "all" ? "1.5px solid #2d4030" : "1px solid #dcd7ca",
              backgroundColor: filterStatus === "all" ? "#2d4030" : "#ffffff",
              color: filterStatus === "all" ? "#ffffff" : "#4b503c",
            }}
          >
            <span>Semua</span>
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "9999px",
                backgroundColor:
                  filterStatus === "all" ? "rgba(255,255,255,0.22)" : "#f1ede2",
                color: filterStatus === "all" ? "#ffffff" : "#555b46",
                fontWeight: 600,
              }}
            >
              {counts.all}
            </span>
          </button>

          {/* Tab Disetujui */}
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === "approved"}
            onClick={() => setFilterStatus("approved")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "9999px",
              fontSize: "12.5px",
              fontWeight: filterStatus === "approved" ? 600 : 500,
              cursor: "pointer",
              transition: "all 160ms ease",
              border:
                filterStatus === "approved" ? "1.5px solid #059669" : "1px solid #dcd7ca",
              backgroundColor: filterStatus === "approved" ? "#ecfdf5" : "#ffffff",
              color: filterStatus === "approved" ? "#065f46" : "#4b503c",
              boxShadow:
                filterStatus === "approved" ? "0 1px 3px rgba(5, 150, 105, 0.15)" : "none",
            }}
          >
            <span>✅ Disetujui</span>
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "9999px",
                backgroundColor: filterStatus === "approved" ? "#a7f3d0" : "#f1ede2",
                color: filterStatus === "approved" ? "#065f46" : "#555b46",
                fontWeight: 600,
              }}
            >
              {counts.approved}
            </span>
          </button>

          {/* Tab Menunggu Verifikasi */}
          <button
            type="button"
            role="tab"
            aria-selected={filterStatus === "pending"}
            onClick={() => setFilterStatus("pending")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              borderRadius: "9999px",
              fontSize: "12.5px",
              fontWeight: filterStatus === "pending" ? 600 : 500,
              cursor: "pointer",
              transition: "all 160ms ease",
              border:
                filterStatus === "pending" ? "1.5px solid #d97706" : "1px solid #dcd7ca",
              backgroundColor: filterStatus === "pending" ? "#fffbeb" : "#ffffff",
              color: filterStatus === "pending" ? "#92400e" : "#4b503c",
              boxShadow:
                filterStatus === "pending" ? "0 1px 3px rgba(217, 119, 6, 0.15)" : "none",
            }}
          >
            <span>⏳ Menunggu Verifikasi</span>
            <span
              style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "9999px",
                backgroundColor: filterStatus === "pending" ? "#fde68a" : "#f1ede2",
                color: filterStatus === "pending" ? "#92400e" : "#555b46",
                fontWeight: 600,
              }}
            >
              {counts.pending}
            </span>
          </button>

          {/* Tab Ditolak (Hanya tampil jika ada pendaftar yang ditolak) */}
          {counts.rejected > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={filterStatus === "rejected"}
              onClick={() => setFilterStatus("rejected")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "9999px",
                fontSize: "12.5px",
                fontWeight: filterStatus === "rejected" ? 600 : 500,
                cursor: "pointer",
                transition: "all 160ms ease",
                border:
                  filterStatus === "rejected" ? "1.5px solid #e11d48" : "1px solid #dcd7ca",
                backgroundColor: filterStatus === "rejected" ? "#fff1f2" : "#ffffff",
                color: filterStatus === "rejected" ? "#9f1239" : "#4b503c",
                boxShadow:
                  filterStatus === "rejected" ? "0 1px 3px rgba(225, 29, 72, 0.15)" : "none",
              }}
            >
              <span>❌ Ditolak</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  backgroundColor: filterStatus === "rejected" ? "#fecdd3" : "#f1ede2",
                  color: filterStatus === "rejected" ? "#9f1239" : "#555b46",
                  fontWeight: 600,
                }}
              >
                {counts.rejected}
              </span>
            </button>
          )}
        </div>

        {/* Filter Cabang Lomba (Dropdown) */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label
            htmlFor="filter-cabang-select"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--mtq-ink, #253828)",
              whiteSpace: "nowrap",
            }}
          >
            Cabang:
          </label>
          <select
            id="filter-cabang-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "13px",
              fontWeight: 500,
              color: "#35533e",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="all">Semua Cabang ({items.length})</option>
            {availableBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>

          {/* Tombol Reset Filter */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                fontSize: "12px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                cursor: "pointer",
                fontWeight: 500,
                transition: "background 150ms ease",
              }}
              title="Reset semua filter ke default"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Daftar Kartu Peserta yang Telah Difilter */}
      {filteredItems.length === 0 ? (
        <div
          className="mtq-account-empty"
          style={{
            marginTop: "20px",
            padding: "32px 20px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px dashed #dcd7ca",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: "14px",
              color: "var(--mtq-muted, #64748b)",
            }}
          >
            Tidak ada pendaftaran yang sesuai dengan kriteria filter yang dipilih.
          </p>
          <button
            type="button"
            className="mtq-button"
            onClick={resetFilters}
            style={{ fontSize: "13px", padding: "6px 14px", cursor: "pointer" }}
          >
            Tampilkan Semua Pendaftaran ({items.length})
          </button>
        </div>
      ) : (
        filteredItems.map(({ record, settings, branchTitle, formattedDate }) => (
          <ParticipantRecordCard
            key={record.id}
            record={record}
            settings={settings}
            branchTitle={branchTitle}
            formattedDate={formattedDate}
            defaultExpanded={false}
          />
        ))
      )}

      {/* Tombol Floating: Daftarkan Peserta Lainnya (Mengikuti scroll user) */}
      {isOpen && (
        <div className="mtq-floating-fab-wrap">
          <Link
            href="/daftar"
            className="mtq-floating-fab"
            title="Daftarkan peserta lainnya"
          >
            <span className="mtq-floating-fab-icon">+</span>
            <span>Daftarkan peserta lainnya</span>
          </Link>
        </div>
      )}
    </div>
  );
}
