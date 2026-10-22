

import { useState, useEffect, useTransition } from "react";
import {
  type ApiKeyItem,
  generateNewApiKey,
  rotateApiKeyAction,
  revokeApiKeyAction,
  deleteApiKeyAction,
} from "@/lib/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface ApiKeyManagerProps {
  initialKeys: ApiKeyItem[];
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(initialKeys);
  const [isPending, startTransition] = useTransition();

  // State Dokumentasi & Tutorial
  const [docOrigin, setDocOrigin] = useState("https://mtq2026.example.com");
  const [activeLang, setActiveLang] = useState<"curl" | "python" | "js" | "php">("curl");
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDocOrigin(window.location.origin);
    }
  }, []);

  function handleCopySnippet(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSnippetId(id);
      setTimeout(() => setCopiedSnippetId(null), 2500);
    }
  }

  // State Modal Buat Kunci
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["peserta:read"]);
  const [createError, setCreateError] = useState("");

  // State Modal Sukses Dibuat / Dirotasi (Menampilkan Raw Key sekali)
  const [createdKeyData, setCreatedKeyData] = useState<{
    name: string;
    rawKey: string;
    scopes: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  // State Modal Konfirmasi Revoke, Rotate & Delete (Custom Dialog)
  const [rotateTarget, setRotateTarget] = useState<ApiKeyItem | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyItem | null>(null);

  function handleScopeToggle(scope: string) {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s: string) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setCreateError("Silakan isi nama instansi atau sistem.");
      return;
    }
    if (selectedScopes.length === 0) {
      setCreateError("Pilih minimal satu hak akses.");
      return;
    }

    setCreateError("");
    startTransition(async () => {
      const result = await generateNewApiKey(newKeyName, selectedScopes);
      if (result.success && result.rawKey) {
        setCreatedKeyData({
          name: result.name,
          rawKey: result.rawKey,
          scopes: result.scopes,
        });
        setIsCreateOpen(false);
        setNewKeyName("");
        setSelectedScopes(["peserta:read"]);

        // Tambahkan ke state lokal sementara
        const optimisticItem: ApiKeyItem = {
          id: result.id,
          name: result.name,
          key_prefix: result.keyPrefix,
          scopes: result.scopes.join(","),
          created_by: "admin",
          last_used_at: null,
          revoked_at: null,
          created_at: new Date().toISOString(),
        };
        setKeys([optimisticItem, ...keys]);
      } else {
        setCreateError(result.error || "Gagal membuat kunci API.");
      }
    });
  }

  function handleRotateConfirm() {
    if (!rotateTarget) return;
    const targetId = rotateTarget.id;
    startTransition(async () => {
      const result = await rotateApiKeyAction(targetId);
      if (result.success && result.rawKey) {
        setCreatedKeyData({
          name: result.name,
          rawKey: result.rawKey,
          scopes: result.scopes,
        });
        setKeys([
          {id:result.id,name:result.name,key_prefix:result.keyPrefix,scopes:result.scopes.join(","),created_by:"admin",last_used_at:null,revoked_at:null,created_at:new Date().toISOString()},
          ...keys.map((k) =>
            k.id === targetId ? { ...k, revoked_at: new Date().toISOString() } : k
          ),
        ]);
      }
      setRotateTarget(null);
    });
  }

  function handleRevokeConfirm() {
    if (!revokeTarget) return;
    const targetId = revokeTarget.id;
    startTransition(async () => {
      await revokeApiKeyAction(targetId);
      setKeys(
        keys.map((k) =>
          k.id === targetId ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
      setRevokeTarget(null);
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    startTransition(async () => {
      await deleteApiKeyAction(targetId);
      setKeys(keys.filter((k) => k.id !== targetId));
      setDeleteTarget(null);
    });
  }

  async function handleCopyKey() {
    if (!createdKeyData?.rawKey) return;
    try {
      await navigator.clipboard.writeText(createdKeyData.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback jika clipboard API diblokir browser
      setCopyNotice("Browser memblokir salin otomatis. Silakan blok dan salin teks kunci secara manual.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          background: "#ffffff",
          padding: "20px 24px",
          borderRadius: "8px",
          border: "1px solid #d8ddd1",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1b3024" }}>
            Kunci API Terdaftar ({keys.length})
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#5c675e" }}>
            Kelola akses sistem luar atau dinas untuk integrasi data pendaftaran MTQ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError("");
            setIsCreateOpen(true);
          }}
          style={{
            backgroundColor: "#35533e",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <span>＋</span> Buat Kunci API Baru
        </button>
      </div>

      {/* Tabel Kunci API */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #d8ddd1",
          overflow: "hidden",
        }}
      >
        {keys.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔑</div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#1b3024" }}>
              Belum Ada Kunci API Khusus
            </h4>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Klik tombol <strong>&quot;Buat Kunci API Baru&quot;</strong> di atas untuk membuat kredensial integrasi pertama.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f8faf7", borderBottom: "1px solid #d8ddd1" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748" }}>Nama Instansi / Klien</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748" }}>Awalan Kunci</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748" }}>Hak Akses (Scopes)</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748" }}>Terakhir Digunakan</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: "#2d3748", textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const isRevoked = Boolean(k.revoked_at);
                  const scopesList = k.scopes.split(",").map((s: string) => s.trim());

                  return (
                    <tr
                      key={k.id}
                      style={{
                        borderBottom: "1px solid #edf2f7",
                        backgroundColor: isRevoked ? "#fafafa" : "#ffffff",
                        opacity: isRevoked ? 0.75 : 1,
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#1b3024" }}>
                        <div>{k.name}</div>
                        <div style={{ fontSize: "11px", color: "#8a9485", fontWeight: 400, marginTop: "2px" }}>
                          Dibuat: {new Date(k.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", fontFamily: "ui-monospace, monospace" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                          }}
                        >
                          {k.key_prefix}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {scopesList.includes("peserta:read") && (
                            <span
                              style={{
                                background: "#ecfdf5",
                                color: "#065f46",
                                border: "1px solid #a7f3d0",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 500,
                              }}
                            >
                              👁 Baca Ringkasan
                            </span>
                          )}
                          {scopesList.includes("peserta:read_documents") && (
                            <span
                              style={{
                                background: "#f5f3ff",
                                color: "#5b21b6",
                                border: "1px solid #ddd6fe",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 500,
                              }}
                            >
                              📁 Unduh Dokumen
                            </span>
                          )}
                          {(scopesList.includes("peserta:read_sensitive") || scopesList.includes("peserta:pii")) && (
                            <span
                              style={{
                                background: "#eff6ff",
                                color: "#1e40af",
                                border: "1px solid #bfdbfe",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 500,
                              }}
                            >
                              🛡 Akses PII Penuh
                            </span>
                          )}
                          {scopesList.includes("peserta:write") && (
                            <span
                              style={{
                                background: "#fffbeb",
                                color: "#92400e",
                                border: "1px solid #fde68a",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: 500,
                              }}
                            >
                              ✍ Ubah Status
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", color: "#5c675e" }}>
                        {k.last_used_at
                          ? new Date(k.last_used_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Belum pernah"}
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        {isRevoked ? (
                          <span
                            style={{
                              display: "inline-block",
                              background: "#fee2e2",
                              color: "#991b1b",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            Dicabut (Revoked)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              background: "#dcfce7",
                              color: "#166534",
                              padding: "3px 10px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}
                          >
                            ● Aktif
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {isRevoked ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => setDeleteTarget(k)}
                            style={{
                              background: "transparent",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              borderRadius: "4px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Hapus
                          </button>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setRotateTarget(k)}
                              title="Cabut kunci ini dan buat kunci baru dengan hak akses yang sama"
                              style={{
                                background: "#f0fdf4",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                                borderRadius: "4px",
                                padding: "5px 10px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              🔄 Rotasi
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setRevokeTarget(k)}
                              style={{
                                background: "#ffffff",
                                color: "#b91c1c",
                                border: "1px solid #f87171",
                                borderRadius: "4px",
                                padding: "5px 10px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              Cabut
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panduan & Tutorial Lengkap Integrasi API */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #d8ddd1",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 700, color: "#1b3024" }}>
              📘 Dokumentasi &amp; Tutorial Integrasi API MTQ
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#5c675e" }}>
              Gunakan endpoint REST API resmi di bawah ini untuk mengintegrasikan data pendaftar MTQ dengan sistem dinas, aplikasi eksternal, atau portal pelaporan.
            </p>
          </div>
          <span
            style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            REST API v1
          </span>
        </div>

        {/* Banner Peringatan Keamanan & Perlindungan Data Pribadi (UU PDP) */}
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "20px", marginTop: "2px" }}>🛡️</span>
          <div style={{ fontSize: "13px", color: "#166534", lineHeight: 1.55 }}>
            <strong style={{ display: "block", fontSize: "13.5px", color: "#14532d", marginBottom: "4px" }}>
              Perlindungan Data Pribadi (UU PDP No. 27/2022) &amp; Keamanan Kunci API
            </strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px" }}>
              <li>
                <strong>Penyensoran Otomatis (Data Masking)</strong>: Secara default seluruh respon API menyensor NIK (contoh: <code>617101******0001</code>), nomor WhatsApp (<code>0812****7890</code>), dan rekening bank peserta.
              </li>
              <li>
                <strong>Akses Penuh Sensitif (Scope <code>peserta:pii</code>)</strong>: Data NIK dan kontak utuh tanpa sensor hanya dapat diakses menggunakan Kunci API ber-scope khusus <code>peserta:pii</code> untuk dinas berwenang resmi.
              </li>
              <li>
                <strong>Pencegahan Kebocoran Kunci</strong>: Jangan pernah menempelkan Kunci API di chat publik, forum, atau repository publik. Jika dicurigai terekspos, segera lakukan rotasi dengan menekan tombol <strong>Cabut Akses (Revoke)</strong>.
              </li>
            </ul>
          </div>
        </div>

        {/* Kotak Informasi Base URL & Autentikasi */}
        <div
          style={{
            background: "#f8faf7",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
              🌐 Base URL Endpoint
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <code
                style={{
                  background: "#1e293b",
                  color: "#38bdf8",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 600,
                  flex: 1,
                  overflowX: "auto",
                }}
              >
                {docOrigin}/api/v1
              </code>
              <button
                type="button"
                onClick={() => handleCopySnippet("base-url", `${docOrigin}/api/v1`)}
                style={{
                  background: copiedSnippetId === "base-url" ? "#059669" : "#ffffff",
                  color: copiedSnippetId === "base-url" ? "#ffffff" : "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copiedSnippetId === "base-url" ? "✓ Tersalin" : "📋 Salin"}
              </button>
            </div>
          </div>

          <div>
            <span style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>
              🔑 Format Header Autentikasi
            </span>
            <code
              style={{
                display: "block",
                background: "#1e293b",
                color: "#f1f5f9",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              X-API-Key: mtq_live_xxx &nbsp;
              <span style={{ color: "#94a3b8" }}>(atau Authorization: Bearer mtq_live_xxx)</span>
            </code>
          </div>
        </div>

        {/* Daftar Endpoint Spesifikasi Lengkap */}
        <h5 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "#1b3024" }}>
          1. Spesifikasi Endpoint (API Reference)
        </h5>
        <div style={{ overflowX: "auto", marginBottom: "24px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8faf7", borderBottom: "1px solid #e2e8f0", color: "#475467" }}>
                <th style={{ padding: "10px 14px", width: "90px" }}>Metode</th>
                <th style={{ padding: "10px 14px" }}>Endpoint</th>
                <th style={{ padding: "10px 14px", width: "120px" }}>Scope Wajib</th>
                <th style={{ padding: "10px 14px" }}>Deskripsi &amp; Parameter</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                    GET
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <code style={{ color: "#0f172a", fontWeight: 600 }}>/api/v1/peserta</code>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>
                    peserta:read
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "#475467", lineHeight: 1.5 }}>
                  Mengambil daftar seluruh peserta MTQ dengan ringkasan statistik dan usia pendaftar.<br />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    <strong>Query params:</strong> <code>status</code> (all/pending/approved/rejected), <code>search</code> (nama/NIK/HP), <code>cabang_id</code>, <code>page</code>, <code>limit</code> (maks 200).
                  </span>
                </td>
              </tr>

              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                    GET
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <code style={{ color: "#0f172a", fontWeight: 600 }}>/api/v1/peserta/:id</code>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>
                    peserta:read
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "#475467", lineHeight: 1.5 }}>
                  Mengambil profil biodata lengkap 1 peserta beserta kelengkapan berkas dokumen digital.
                </td>
              </tr>

              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                    GET
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <code style={{ color: "#0f172a", fontWeight: 600 }}>/api/v1/peserta/:id/dokumen/:jenis</code>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>
                    peserta:read
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "#475467", lineHeight: 1.5 }}>
                  Mengunduh / streaming file dokumen asli langsung dari penyimpanan privat VPS.<br />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Pilihan <code>:jenis</code>: <code>kk</code>, <code>ktp</code>, <code>akta</code>, atau <code>surat_pernyataan</code>.
                  </span>
                </td>
              </tr>

              <tr>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                    PATCH
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <code style={{ color: "#0f172a", fontWeight: 600 }}>/api/v1/peserta/:id</code>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#fefce8", color: "#854d0e", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: "4px", fontSize: "11px" }}>
                    peserta:write
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: "#475467", lineHeight: 1.5 }}>
                  Memperbarui status verifikasi peserta dari sistem dinas / eksternal.<br />
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    <strong>JSON Body:</strong> <code>{`{ "status": "approved" | "rejected", "catatan_revisi": "..." }`}</code>.
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tab Bahasa Pemrograman & Contoh Kode Praktis */}
        <h5 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600, color: "#1b3024" }}>
          2. Contoh Kode Praktis (Pilih Bahasa)
        </h5>

        {/* Tab Buttons */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "16px" }}>
          {(
            [
              { id: "curl", label: "cURL (Terminal)" },
              { id: "python", label: "Python (requests)" },
              { id: "js", label: "JavaScript / Node.js" },
              { id: "php", label: "PHP (cURL)" },
            ] as const
          ).map((tab) => {
            const isActive = activeLang === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLang(tab.id)}
                style={{
                  padding: "8px 16px",
                  background: isActive ? "#35533e" : "#f1f5f9",
                  color: isActive ? "#ffffff" : "#475467",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Snippet Sesuai Bahasa yang Dipilih */}
        {activeLang === "curl" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* cURL 1: List Peserta */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  A. Mengambil Daftar Peserta (GET List &amp; Statistik)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopySnippet(
                      "curl-list",
                      `curl -X GET "${docOrigin}/api/v1/peserta?status=approved&limit=20" \\\n  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\\n  -H "Accept: application/json"`
                    )
                  }
                  style={{
                    background: copiedSnippetId === "curl-list" ? "#059669" : "#ffffff",
                    color: copiedSnippetId === "curl-list" ? "#ffffff" : "#475467",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {copiedSnippetId === "curl-list" ? "✓ Tersalin" : "📋 Salin cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, monospace",
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
{`curl -X GET "${docOrigin}/api/v1/peserta?status=approved&limit=20" \\
  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\
  -H "Accept: application/json"`}
              </pre>
            </div>

            {/* cURL 2: Detail Peserta */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  B. Mengambil Detail Biodata Peserta (GET Detail)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopySnippet(
                      "curl-detail",
                      `curl -X GET "${docOrigin}/api/v1/peserta/1" \\\n  -H "X-API-Key: mtq_live_ganti_dengan_key_anda"`
                    )
                  }
                  style={{
                    background: copiedSnippetId === "curl-detail" ? "#059669" : "#ffffff",
                    color: copiedSnippetId === "curl-detail" ? "#ffffff" : "#475467",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {copiedSnippetId === "curl-detail" ? "✓ Tersalin" : "📋 Salin cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, monospace",
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
{`curl -X GET "${docOrigin}/api/v1/peserta/1" \\
  -H "X-API-Key: mtq_live_ganti_dengan_key_anda"`}
              </pre>
            </div>

            {/* cURL 3: Unduh Berkas */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  C. Mengunduh Dokumen Kartu Keluarga / KTP (GET Binary)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopySnippet(
                      "curl-doc",
                      `curl -X GET "${docOrigin}/api/v1/peserta/1/dokumen/kk" \\\n  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\\n  --output berkas_kk_peserta_1.pdf`
                    )
                  }
                  style={{
                    background: copiedSnippetId === "curl-doc" ? "#059669" : "#ffffff",
                    color: copiedSnippetId === "curl-doc" ? "#ffffff" : "#475467",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {copiedSnippetId === "curl-doc" ? "✓ Tersalin" : "📋 Salin cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, monospace",
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
{`curl -X GET "${docOrigin}/api/v1/peserta/1/dokumen/kk" \\
  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\
  --output berkas_kk_peserta_1.pdf`}
              </pre>
            </div>

            {/* cURL 4: Update Verifikasi */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                  D. Verifikasi Peserta: Setujui atau Tolak (PATCH)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopySnippet(
                      "curl-patch",
                      `curl -X PATCH "${docOrigin}/api/v1/peserta/1" \\\n  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "status": "approved"\n  }'`
                    )
                  }
                  style={{
                    background: copiedSnippetId === "curl-patch" ? "#059669" : "#ffffff",
                    color: copiedSnippetId === "curl-patch" ? "#ffffff" : "#475467",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {copiedSnippetId === "curl-patch" ? "✓ Tersalin" : "📋 Salin cURL"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "12px 14px",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontFamily: "ui-monospace, monospace",
                  overflowX: "auto",
                  lineHeight: 1.6,
                }}
              >
{`curl -X PATCH "${docOrigin}/api/v1/peserta/1" \\
  -H "X-API-Key: mtq_live_ganti_dengan_key_anda" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "approved"
  }'`}
              </pre>
            </div>
          </div>
        )}

        {activeLang === "python" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                Script Python Lengkap (Tarik Data, Unduh File, &amp; Verifikasi)
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopySnippet(
                    "py-full",
                    `import requests\n\nBASE_URL = "${docOrigin}/api/v1"\nAPI_KEY = "mtq_live_ganti_dengan_key_anda"\n\nheaders = {\n    "X-API-Key": API_KEY,\n    "Accept": "application/json"\n}\n\n# 1. Mengambil daftar peserta yang sudah disetujui\nprint("=== MENGAMBIL DAFTAR PESERTA ===")\nres = requests.get(f"{BASE_URL}/peserta", headers=headers, params={\n    "status": "approved",\n    "limit": 50,\n    "page": 1\n})\n\nif res.status_code == 200:\n    data = res.json()\n    print(f"Total Peserta Disetujui: {data['pagination']['total_items']}")\n    for p in data["data"]:\n        print(f"- [{p['id']}] {p['nama']} | Cabang: {p['cabang']['nama']} | Kel: {p['alamat']}")\nelse:\n    print("Gagal mengambil data:", res.status_code, res.text)\n\n# 2. Mengambil detail peserta ID 1 dan mengunduh berkas KK\nprint("\\n=== MENGAMBIL DETAIL & UNDUH DOKUMEN ===")\ndetail_res = requests.get(f"{BASE_URL}/peserta/1", headers=headers)\nif detail_res.status_code == 200:\n    peserta = detail_res.json()["data"]\n    print(f"Nama: {peserta['nama']}, Usia: {peserta['usia']['tahun']}")\n\n    # Unduh file Kartu Keluarga jika tersedia\n    if peserta["dokumen"]["kartu_keluarga"]["tersedia"]:\n        file_res = requests.get(f"{BASE_URL}/peserta/1/dokumen/kk", headers=headers)\n        with open(f"berkas_kk_{peserta['id']}.pdf", "wb") as f:\n            f.write(file_res.content)\n        print("File KK berhasil diunduh dan disimpan!")\n\n# 3. Mengubah status verifikasi pendaftar (Setujui)\n# Membutuhkan hak akses (scope) 'peserta:write'\n# payload = {\n#     "status": "approved"\n# }\n# update_res = requests.patch(f"{BASE_URL}/peserta/1", headers=headers, json=payload)\n# print("Hasil Update:", update_res.json())`
                  )
                }
                style={{
                  background: copiedSnippetId === "py-full" ? "#059669" : "#ffffff",
                  color: copiedSnippetId === "py-full" ? "#ffffff" : "#475467",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                {copiedSnippetId === "py-full" ? "✓ Tersalin" : "📋 Salin Script Python"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "12px 14px",
                background: "#1e293b",
                color: "#e2e8f0",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                overflowX: "auto",
                lineHeight: 1.6,
              }}
            >
{`import requests

BASE_URL = "${docOrigin}/api/v1"
API_KEY = "mtq_live_ganti_dengan_key_anda"

headers = {
    "X-API-Key": API_KEY,
    "Accept": "application/json"
}

# 1. Mengambil daftar peserta yang sudah disetujui
print("=== MENGAMBIL DAFTAR PESERTA ===")
res = requests.get(f"{BASE_URL}/peserta", headers=headers, params={
    "status": "approved",
    "limit": 50,
    "page": 1
})

if res.status_code == 200:
    data = res.json()
    print(f"Total Peserta Disetujui: {data['pagination']['total_items']}")
    for p in data["data"]:
        print(f"- [{p['id']}] {p['nama']} | Cabang: {p['cabang']['nama']} | Kel: {p['alamat']}")
else:
    print("Gagal mengambil data:", res.status_code, res.text)

# 2. Mengambil detail peserta ID 1 dan mengunduh berkas KK
print("\\n=== MENGAMBIL DETAIL & UNDUH DOKUMEN ===")
detail_res = requests.get(f"{BASE_URL}/peserta/1", headers=headers)
if detail_res.status_code == 200:
    peserta = detail_res.json()["data"]
    print(f"Nama: {peserta['nama']}, Usia: {peserta['usia']['tahun']}")

    # Unduh file Kartu Keluarga jika tersedia
    if peserta["dokumen"]["kartu_keluarga"]["tersedia"]:
        file_res = requests.get(f"{BASE_URL}/peserta/1/dokumen/kk", headers=headers)
        with open(f"berkas_kk_{peserta['id']}.pdf", "wb") as f:
            f.write(file_res.content)
        print("File KK berhasil diunduh dan disimpan!")

# 3. Mengubah status verifikasi pendaftar (Setujui)
# Membutuhkan hak akses (scope) 'peserta:write'
# payload = {
#     "status": "approved"
# }
# update_res = requests.patch(f"{BASE_URL}/peserta/1", headers=headers, json=payload)
# print("Hasil Update:", update_res.json())`}
            </pre>
          </div>
        )}

        {activeLang === "js" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                Integrasi JavaScript / TypeScript / Node.js (Fetch API)
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopySnippet(
                    "js-full",
                    `const BASE_URL = "${docOrigin}/api/v1";\nconst API_KEY = "mtq_live_ganti_dengan_key_anda";\n\n// 1. Ambil daftar peserta dengan filter\nasync function getDaftarPeserta() {\n  const url = new URL(\`\${BASE_URL}/peserta\`);\n  url.searchParams.set("status", "approved");\n  url.searchParams.set("limit", "25");\n\n  const res = await fetch(url.toString(), {\n    headers: {\n      "X-API-Key": API_KEY,\n      "Accept": "application/json"\n    }\n  });\n\n  if (!res.ok) throw new Error(\`Gagal \${res.status}: \${await res.text()}\`);\n  const data = await res.json();\n  console.log("Total:", data.total);\n  return data.data;\n}\n\n// 2. Ubah status verifikasi peserta\nasync function verifikasiPeserta(id, status, alasanPenolakan = "") {\n  const res = await fetch(\`\${BASE_URL}/peserta/\${id}\`, {\n    method: "PATCH",\n    headers: {\n      "X-API-Key": API_KEY,\n      "Content-Type": "application/json"\n    },\n    body: JSON.stringify({\n      status,\n      catatan_revisi: status === "rejected" ? alasanPenolakan : undefined\n    })\n  });\n\n  return await res.json();\n}`
                  )
                }
                style={{
                  background: copiedSnippetId === "js-full" ? "#059669" : "#ffffff",
                  color: copiedSnippetId === "js-full" ? "#ffffff" : "#475467",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                {copiedSnippetId === "js-full" ? "✓ Tersalin" : "📋 Salin Kode JS"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "12px 14px",
                background: "#1e293b",
                color: "#e2e8f0",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                overflowX: "auto",
                lineHeight: 1.6,
              }}
            >
{`const BASE_URL = "${docOrigin}/api/v1";
const API_KEY = "mtq_live_ganti_dengan_key_anda";

// 1. Ambil daftar peserta dengan filter
async function getDaftarPeserta() {
  const url = new URL(\`\${BASE_URL}/peserta\`);
  url.searchParams.set("status", "approved");
  url.searchParams.set("limit", "25");

  const res = await fetch(url.toString(), {
    headers: {
      "X-API-Key": API_KEY,
      "Accept": "application/json"
    }
  });

  if (!res.ok) throw new Error(\`Gagal \${res.status}: \${await res.text()}\`);
  const data = await res.json();
  console.log("Total:", data.total);
  return data.data;
}

// 2. Ubah status verifikasi peserta
async function verifikasiPeserta(id, status, alasanPenolakan = "") {
  const res = await fetch(\`\${BASE_URL}/peserta/\${id}\`, {
    method: "PATCH",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      status,
      catatan_revisi: status === "rejected" ? alasanPenolakan : undefined
    })
  });

  return await res.json();
}`}
            </pre>
          </div>
        )}

        {activeLang === "php" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
                Integrasi PHP (cURL Client)
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopySnippet(
                    "php-full",
                    `<?php\n\n$baseUrl = "${docOrigin}/api/v1";\n$apiKey  = "mtq_live_ganti_dengan_key_anda";\n\n// 1. Mengambil daftar peserta\n$ch = curl_init("$baseUrl/peserta?status=approved&limit=25");\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "X-API-Key: $apiKey",\n    "Accept: application/json"\n]);\n\n$response = curl_exec($ch);\n$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);\ncurl_close($ch);\n\nif ($httpCode === 200) {\n    $result = json_decode($response, true);\n    echo "Total Peserta: " . $result['total'] . "\\n";\n    foreach ($result['data'] as $p) {\n        echo "- " . $p['nama'] . " (" . $p['cabang']['nama'] . ")\\n";\n    }\n} else {\n    echo "Error $httpCode: $response\\n";\n}`
                  )
                }
                style={{
                  background: copiedSnippetId === "php-full" ? "#059669" : "#ffffff",
                  color: copiedSnippetId === "php-full" ? "#ffffff" : "#475467",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                {copiedSnippetId === "php-full" ? "✓ Tersalin" : "📋 Salin Script PHP"}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: "12px 14px",
                background: "#1e293b",
                color: "#e2e8f0",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "ui-monospace, monospace",
                overflowX: "auto",
                lineHeight: 1.6,
              }}
            >
{`<?php

$baseUrl = "${docOrigin}/api/v1";
$apiKey  = "mtq_live_ganti_dengan_key_anda";

// 1. Mengambil daftar peserta
$ch = curl_init("$baseUrl/peserta?status=approved&limit=25");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "X-API-Key: $apiKey",
    "Accept: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo "Total Peserta: " . $result['total'] . "\\n";
    foreach ($result['data'] as $p) {
        echo "- " . $p['nama'] . " (" . $p['cabang']['nama'] . ")\\n";
    }
} else {
    echo "Error $httpCode: $response\\n";
}`}
            </pre>
          </div>
        )}

        {/* Format Respon & Error Codes */}
        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
          <h5 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: 600, color: "#1b3024" }}>
            3. Kode Status HTTP &amp; Format Error
          </h5>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div style={{ background: "#f8faf7", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#15803d", fontSize: "13px" }}>200 OK</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                Permintaan berhasil diproses. Mengembalikan data dalam format JSON standar.
              </p>
            </div>
            <div style={{ background: "#f8faf7", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#b45309", fontSize: "13px" }}>401 Unauthorized</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                Header <code>X-API-Key</code> kosong, salah, atau tidak valid.
              </p>
            </div>
            <div style={{ background: "#f8faf7", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#dc2626", fontSize: "13px" }}>403 Forbidden</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                Kunci API telah dicabut (revoked) atau tidak memiliki scope yang diminta (misal: butuh <code>peserta:write</code>).
              </p>
            </div>
            <div style={{ background: "#f8faf7", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#64748b", fontSize: "13px" }}>404 Not Found</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                Peserta atau berkas dokumen yang diminta tidak ditemukan di database atau penyimpanan R2.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Buat Kunci Baru */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 100,
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
              border: "1px solid #d8ddd1",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#1b3024" }}>
                Buat Kunci API Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#8a9485" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#2d3748", marginBottom: "6px" }}>
                  Nama Instansi / Pengguna Kunci
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dinas Kominfo Kota Pontianak, Kemenag, atau Portal Kecamatan"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#2d3748", marginBottom: "8px" }}>
                  Hak Akses (Scopes)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: selectedScopes.includes("peserta:read") ? "#f0fdf4" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("peserta:read")}
                      onChange={() => handleScopeToggle("peserta:read")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "#166534" }}>
                        👁 Baca Ringkasan Peserta (peserta:read)
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Dapat melihat daftar peserta dan status pendaftaran. Data sensitif (NIK, nomor HP, alamat) dimasking sesuai standar UU PDP.
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: selectedScopes.includes("peserta:read_documents") ? "#f5f3ff" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("peserta:read_documents")}
                      onChange={() => handleScopeToggle("peserta:read_documents")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "#5b21b6" }}>
                        📁 Unduh Dokumen Digital (peserta:read_documents)
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Memberikan akses streaming/unduh berkas sah Kartu Keluarga, KTP/KIA, Akta Lahir, dan Surat Pernyataan dari R2 Storage.
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: selectedScopes.includes("peserta:read_sensitive") ? "#eff6ff" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("peserta:read_sensitive")}
                      onChange={() => handleScopeToggle("peserta:read_sensitive")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "#1e40af" }}>
                        🛡 Akses Data Sensitif / PII Lengkap (peserta:read_sensitive)
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Membuka sensor NIK utuh, WhatsApp utuh, alamat lengkap, tanggal lahir, dan rekening. Khusus instansi verifikator resmi.
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: selectedScopes.includes("peserta:write") ? "#fefce8" : "#f8fafc",
                      border: "1px solid #e2e8f0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes("peserta:write")}
                      onChange={() => handleScopeToggle("peserta:write")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ display: "block", fontSize: "13px", color: "#854d0e" }}>
                        ✍ Ubah Status Verifikasi (peserta:write)
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Dapat menyetujui (approved) atau menolak (rejected) pendaftaran peserta dan mencatat alasan penolakan secara langsung.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {createError && (
                <div style={{ marginBottom: "16px", padding: "10px", background: "#fef2f2", color: "#b91c1c", fontSize: "13px", borderRadius: "6px" }}>
                  {createError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    padding: "9px 16px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    padding: "9px 20px",
                    background: "#35533e",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isPending ? "Memproses…" : "Buat Kunci Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sukses Dibuat (Menampilkan Kunci Utuh Sekali) */}
      {createdKeyData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "10px",
              maxWidth: "520px",
              width: "100%",
              padding: "28px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              border: "1px solid #d8ddd1",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                fontSize: "24px",
              }}
            >
              ✓
            </div>

            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 700, color: "#166534" }}>
              Kunci API Berhasil Dibuat!
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#4b5563", lineHeight: 1.5 }}>
              Kunci untuk <strong>{createdKeyData.name}</strong> siap digunakan. Salin dan simpan kunci ini sekarang karena demi alasan keamanan sistem tidak akan menampilkan kunci lengkap ini lagi.
            </p>

            <div
              style={{
                background: "#f1f5f9",
                border: "1px dashed #94a3b8",
                borderRadius: "6px",
                padding: "14px",
                marginBottom: "20px",
                wordBreak: "break-all",
                fontFamily: "ui-monospace, monospace",
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {createdKeyData.rawKey}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleCopyKey}
                style={{
                  padding: "10px 20px",
                  background: copied ? "#059669" : "#35533e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {copied ? "✓ Tersalin ke Clipboard!" : "📋 Salin Kunci API"}
              </button>
              <button
                type="button"
                onClick={() => setCreatedKeyData(null)}
                style={{
                  padding: "10px 18px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog Konfirmasi Rotasi Kunci API */}
      <ConfirmDialog
        isOpen={!!rotateTarget}
        title="Rotasi Kunci API?"
        message={`Apakah Anda yakin ingin merotasi kunci API "${rotateTarget?.name}"?\nKunci lama akan langsung dicabut dan kunci baru dengan hak akses yang sama akan dibuat.`}
        confirmLabel="Ya, Rotasi Kunci Sekarang"
        cancelLabel="Batal"
        variant="success"
        isLoading={isPending}
        onConfirm={handleRotateConfirm}
        onCancel={() => setRotateTarget(null)}
      />

      {/* Custom Alert Dialog Konfirmasi Cabut Akses (Revoke) */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        title="Cabut Akses Kunci API?"
        message={`Apakah Anda yakin ingin mencabut akses untuk "${revokeTarget?.name}"?\nSetelah dicabut, sistem atau dinas terkait tidak akan dapat lagi menggunakan kunci API ini.`}
        confirmLabel="Ya, Cabut Kunci"
        cancelLabel="Batal"
        variant="warning"
        isLoading={isPending}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Custom Alert Dialog Konfirmasi Hapus Riwayat (Delete) */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Riwayat Kunci API?"
        message={`Apakah Anda yakin ingin menghapus riwayat kunci API "${deleteTarget?.name}" secara permanen?\nData kunci ini akan dihapus dari sistem dan tidak dapat dipulihkan.`}
        confirmLabel="Ya, Hapus Permanen"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Custom Alert Dialog Pemberitahuan Salin Manual */}
      <ConfirmDialog
        isOpen={!!copyNotice}
        title="Pemberitahuan Salin Kunci"
        message={copyNotice || ""}
        confirmLabel="Mengerti / Tutup"
        cancelLabel={null}
        variant="info"
        onConfirm={() => setCopyNotice(null)}
      />
    </div>
  );
}
