
import { useState, useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { saveEventSettings, copyEventSettings, activateEvent } from "@/lib/actions";
import { type EventSettings, eventIsOpen, validateEventSettings } from "@shared/event-settings";

export interface AuditItem {
  id: number;
  action: string;
  actor: string;
  created_at: string;
}

type TabKey = "identity" | "registration" | "content" | "assets" | "branches" | "next_event" | "history";
const TABS: { id: TabKey; label: string }[] = [
  { id: "identity", label: "Identitas acara" },
  { id: "registration", label: "Pendaftaran" },
  { id: "content", label: "Isi beranda" },
  { id: "assets", label: "Logo & surat" },
  { id: "branches", label: "Cabang & ketentuan usia" },
  { id: "next_event", label: "Acara berikutnya" },
  { id: "history", label: "Riwayat perubahan" },
];

const auditLabels: Record<string, string> = {
  save: "Pengaturan disimpan",
  copy: "Acara disalin",
  activate: "Acara diaktifkan",
};

function localDate(value: string) {
  if (!value) return "";
  const date = new Date(Date.parse(value) + 7 * 3600000);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0,16) : "";
}
export function EventSettingsForm({ initial, eventId, revision: initialRevision, active, audit = [] }: { initial: EventSettings; eventId: string; revision: number; active: boolean; audit?: AuditItem[] }) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [revision, setRevision] = useState(initialRevision);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [statusModal, setStatusModal] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("identity");
  const [year, setYear] = useState(initial.year + 1);
  const router = useRouter();

  function routeValidationTab(errText: string) {
    const lower = errText.toLowerCase();
    if (lower.includes("nama") || lower.includes("wilayah") || lower.includes("tahun") || lower.includes("nomor")) {
      setActiveTab("identity");
    } else if (lower.includes("usia") || lower.includes("tanggal") || lower.includes("pendaftaran") || lower.includes("acuan")) {
      setActiveTab("registration");
    } else if (lower.includes("cabang")) {
      setActiveTab("branches");
    } else if (lower.includes("logo") || lower.includes("berkas") || lower.includes("surat") || lower.includes("template")) {
      setActiveTab("assets");
    }
  }

  function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    try {
      validateEventSettings(draft);
      setMessage("");
      setPreview(true);
    } catch (error) {
      const errText = error instanceof Error ? error.message : "Pengaturan belum valid.";
      setMessage(errText);
      routeValidationTab(errText);
      setStatusModal({
        type: "error",
        title: "Pemeriksaan Pengaturan Belum Lengkap",
        message: `Tidak dapat membuka pratinjau karena ada data yang belum valid:\n\n${errText}`,
      });
    }
  }

  async function handleSaveSettings() {
    try {
      validateEventSettings(draft);
    } catch (error) {
      const errText = error instanceof Error ? error.message : "Pengaturan belum valid.";
      setMessage(errText);
      routeValidationTab(errText);
      setStatusModal({
        type: "error",
        title: "Pemeriksaan Pengaturan Belum Lengkap",
        message: `Tidak dapat menyimpan pengaturan karena ada data yang belum valid:\n\n${errText}`,
      });
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const result = await saveEventSettings(eventId, revision, draft);
      setRevision(result.revision);
      setSaved(draft);
      setPreview(false);
      const successMsg = "Semua perubahan pengaturan acara telah berhasil disimpan ke sistem dan langsung aktif.";
      setMessage(successMsg);
      setStatusModal({
        type: "success",
        title: "Pengaturan Berhasil Disimpan",
        message: successMsg,
      });
      router.refresh();
    } catch (error) {
      const errText = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan pengaturan. Coba kembali.";
      setMessage(errText);
      setStatusModal({
        type: "error",
        title: "Gagal Menyimpan Pengaturan",
        message: errText,
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (statusModal) setStatusModal(null);
        else if (preview) setPreview(false);
      }
    }
    if (preview || statusModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [preview, statusModal]);

  function update<K extends keyof EventSettings>(key: K, value: EventSettings[K]) { setDraft(d => ({ ...d, [key]: value })); setPreview(false); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try {
      await action();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan. Coba kembali.";
      setMessage(errMsg);
      setStatusModal({
        type: "error",
        title: "Terjadi Kesalahan",
        message: errMsg,
      });
    } finally {
      setBusy(false);
    }
  }
  const text = (key: "name" | "edition" | "district" | "organizer" | "region" | "schedule" | "venue" | "contact", label: string) => <label>{label}<input value={draft[key]} onChange={e => update(key, e.target.value)} required={key === "name" || key === "district"} maxLength={4000} /></label>;
  const date = (key: "opensAt" | "deadline", label: string) => {
    const setDay = (value: string) => update(key, value ? `${value}T${localDate(draft[key]).slice(11,16) || (key === "deadline" ? "23:59" : "00:00")}:00+07:00` : "");
    const setTime = (value: string) => { if(value) update(key,`${localDate(draft[key]).slice(0,10)}T${value.slice(0,5)}:00+07:00`); };
    const isDeadline = key === "deadline";
    return (
      <div
        style={{
          background: "#fafbf9",
          border: "1px solid #d8ddd1",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, fontSize: "15px", color: "#1b3024" }}>
          <span>{isDeadline ? "⏳" : "🚀"}</span>
          <span>{label}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
          <label style={{ margin: 0 }}>
            <span style={{ fontSize: "13px", color: "#475467", fontWeight: 500 }}>Tanggal</span>
            <input
              type="date"
              value={localDate(draft[key]).slice(0, 10)}
              onChange={(e) => setDay(e.target.value)}
              onInput={(e) => setDay(e.currentTarget.value)}
            />
          </label>
          <label style={{ margin: 0 }}>
            <span style={{ fontSize: "13px", color: "#475467", fontWeight: 500 }}>
              Jam {isDeadline ? "tutup" : "buka"} (WIB)
            </span>
            <input
              type="time"
              disabled={!draft[key]}
              value={localDate(draft[key]).slice(11, 16)}
              onChange={(e) => setTime(e.target.value)}
              onInput={(e) => setTime(e.currentTarget.value)}
            />
          </label>
        </div>
      </div>
    );
  };
  async function upload(key: "logo" | "districtLogo" | "organizerLogo" | "statementTemplate", file: File) {
    await run(async () => {
      const data = new FormData(); data.set("file", file); data.set("kind", key === "statementTemplate" ? "template" : "logo");
      const response = await fetch("/api/event-assets", { method: "POST", body: data });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      update(key, result.url);
      const msg = "Berkas berhasil diunggah. Klik pratinjau perubahan atau simpan untuk menerapkannya.";
      setMessage(msg);
      setStatusModal({
        type: "success",
        title: "Berkas Berhasil Diunggah",
        message: msg,
      });
    });
  }
  return <div className="event-settings">
    <form noValidate onSubmit={handlePreview}>
      <div className="event-settings-tabs" role="tablist" aria-label="Kategori Pengaturan">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className="event-settings-tab-btn"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === "branches" ? ` (${draft.branches.length})` : ""}
          </button>
        ))}
      </div>

      {activeTab === "identity" && (
        <fieldset disabled={busy}>
          <legend>Identitas acara</legend>
          <div className="event-settings-grid">
            {text("name", "Nama acara")}
            {text("edition", "Nomor MTQ (misalnya XXXV)")}
            <label>Tahun<input type="number" min={2000} max={2200} required value={draft.year} onChange={e => update("year", Number(e.target.value))} /></label>
            {text("district", "Kecamatan / wilayah")}
            {text("organizer", "Penyelenggara")}
            {text("region", "Kota dan provinsi")}
          </div>
        </fieldset>
      )}

      {activeTab === "registration" && (
        <fieldset disabled={busy}>
          <legend>Pendaftaran</legend>
          <div className="event-settings-grid">
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <label htmlFor="registration-mode" style={{ margin: "0 0 10px 0" }}>
                <span>Status pendaftaran</span>
                <select
                  id="registration-mode"
                  value={draft.registrationMode}
                  onChange={(e) => update("registrationMode", e.target.value as EventSettings["registrationMode"])}
                >
                  <option value="auto">Otomatis mengikuti tanggal</option>
                  <option value="open">Buka manual (abaikan tanggal)</option>
                  <option value="closed">Tutup manual</option>
                  <option value="postponed">Ditunda (Postponed)</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                <button
                  type="button"
                  style={{
                    margin: 0,
                    minHeight: "40px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    ...(draft.registrationMode === "postponed"
                      ? { backgroundColor: "#d97706", color: "#fff", borderColor: "#b45309" }
                      : {}),
                  }}
                  onClick={() => update("registrationMode", draft.registrationMode === "postponed" ? "auto" : "postponed")}
                >
                  {draft.registrationMode === "postponed" ? "✓ Status: Acara Ditunda (Klik untuk Batalkan)" : "⏸ Tunda Acara (Postpone)"}
                </button>
                {draft.registrationMode === "postponed" && (
                  <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 500 }}>
                    Pendaftaran ditutup &amp; diberi label &quot;Ditunda&quot;.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ margin: "0 0 8px 0" }}>
                <span>Acuan usia peserta</span>
                <input
                  type="date"
                  required
                  value={draft.referenceDate}
                  onChange={(e) => update("referenceDate", e.target.value)}
                  onInput={(e) => update("referenceDate", e.currentTarget.value)}
                />
              </label>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Tanggal patokan untuk verifikasi batas usia semua cabang lomba.
              </span>
            </div>

            {date("opensAt", "Mulai pendaftaran")}
            {date("deadline", "Batas pendaftaran")}
          </div>
          <p style={{ marginTop: "16px", fontSize: "13px", color: "#5c675e" }}>
            Jika otomatis dan tanggal dikosongkan, tanggal tersebut tidak membatasi pendaftaran. Perubahan acuan usia berlaku untuk pendaftaran berikutnya.
          </p>
        </fieldset>
      )}

      {activeTab === "content" && (
        <fieldset disabled={busy}>
          <legend>Isi beranda</legend>
          <label>Pengantar beranda<textarea value={draft.heroText} onChange={e => update("heroText", e.target.value)} maxLength={4000} /></label>
          <div className="event-settings-grid">
            {text("schedule", "Jadwal lomba")}
            {text("venue", "Lokasi lomba")}
            {text("contact", "Kontak panitia (ditampilkan publik)")}
          </div>
          <label>Pengumuman<textarea value={draft.announcement} onChange={e => update("announcement", e.target.value)} maxLength={4000} /></label>
        </fieldset>
      )}

      {activeTab === "assets" && (
        <fieldset disabled={busy}>
          <legend>Logo dan surat pernyataan</legend>
          <p>Logo: PNG, JPG, WebP. Surat: PDF. Maksimum 5 MB per berkas.</p>
          <div className="event-settings-grid">
            {([ ["logo", "Logo utama"], ["districtLogo", "Logo wilayah"], ["organizerLogo", "Logo penyelenggara"], ["statementTemplate", "Template surat pernyataan"] ] as const).map(([key,label]) => (
              <label key={key}>
                {label}
                {key !== "statementTemplate" && <img src={draft[key]} alt={label} width={64} height={64} style={{objectFit:"contain"}} />}
                <a href={draft[key]} target="_blank" rel="noreferrer">Lihat berkas saat ini</a>
                <input type="file" accept={key === "statementTemplate" ? "application/pdf" : "image/png,image/jpeg,image/webp"} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(key,file); e.target.value = ""; }} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {activeTab === "branches" && (
        <fieldset disabled={busy}>
          <legend>Cabang dan ketentuan usia</legend>
          <p>Kosongkan batas usia yang tidak digunakan. Kode cabang dipertahankan agar riwayat peserta tetap konsisten.</p>
          {draft.branches.map((branch,index) => (
            <details key={branch.id} className="event-settings-branch">
              <summary>{branch.name}</summary>
              <div className="event-settings-grid">
                <label>Nama cabang<input value={branch.name} required onChange={e => update("branches",draft.branches.map((b,i)=>i===index?{...b,name:e.target.value}:b))} /></label>
                <label>Keterangan<input value={branch.description} onChange={e => update("branches",draft.branches.map((b,i)=>i===index?{...b,description:e.target.value}:b))} /></label>
                {([ ["minAgeYears","Minimum tahun",120], ["maxAgeYears","Maksimum tahun",120], ["maxAgeMonths","Maksimum bulan",11], ["maxAgeDays","Maksimum hari",30] ] as const).map(([key,label,max]) => (
                  <label key={key}>
                    {label}
                    <input type="number" min={0} max={max} value={branch[key] ?? ""} onChange={e => update("branches", draft.branches.map((b,i)=>i===index?{...b,[key]:e.target.value===""?undefined:Number(e.target.value)}:b))} />
                  </label>
                ))}
              </div>
              <button type="button" onClick={()=>update("branches",draft.branches.filter((_,i)=>i!==index))}>Hapus cabang dari acara</button>
            </details>
          ))}
          <button type="button" disabled={draft.branches.length >= 60} onClick={()=>update("branches",[...draft.branches,{id:`cabang-${crypto.randomUUID().slice(0,8)}`,name:"Cabang baru",description:""}])}>
            Tambah cabang
          </button>
        </fieldset>
      )}

      {activeTab === "next_event" && (
        <div style={{ marginTop: "20px" }}>
          <section className="event-settings-copy" style={{ margin: "0 0 24px 0" }}>
            <h3>Acara tahun berikutnya</h3>
            <p>Salin identitas, logo, surat, dan cabang. Peserta tidak disalin. Acara baru ditutup dan belum tampil di beranda sampai diaktifkan.</p>
            <label>
              Tahun acara baru
              <input type="number" min={2000} max={2200} value={year} onChange={e=>setYear(Number(e.target.value))} />
            </label>
            <button
              type="button"
              disabled={busy || dirty}
              onClick={()=>void run(async()=>{
                const result = await copyEventSettings(eventId, year);
                setStatusModal({
                  type: "success",
                  title: "Acara Baru Berhasil Dibuat",
                  message: `Acara untuk tahun ${year} telah berhasil dibuat. Anda akan dialihkan ke halaman pengaturan acara baru tersebut.`,
                });
                router.push(`/admin/pengaturan?event=${result.id}`);
                router.refresh();
              })}
            >
              Buat acara baru dari acara ini
            </button>
            {dirty && <p style={{ color: "#b45309", fontSize: "13px", marginTop: "8px" }}>Simpan perubahan pengaturan terlebih dahulu sebelum menyalin acara.</p>}
          </section>

          {!active && (
            <section className="event-settings-copy" style={{ margin: 0 }}>
              <h3>Tampilkan acara ini di beranda</h3>
              <p>Acara aktif sebelumnya tetap tersimpan. Pendaftaran baru akan terhubung ke acara ini.</p>
              <button
                type="button"
                disabled={busy || dirty}
                onClick={()=>void run(async()=>{
                  await activateEvent(eventId);
                  setMessage("Acara ini sudah aktif di beranda.");
                  setStatusModal({
                    type: "success",
                    title: "Acara Berhasil Diaktifkan",
                    message: "Acara ini sekarang telah aktif dan langsung ditampilkan di beranda publik.",
                  });
                  router.refresh();
                })}
              >
                Aktifkan acara ini
              </button>
              {dirty && <p style={{ color: "#b45309", fontSize: "13px", marginTop: "8px" }}>Simpan perubahan pengaturan terlebih dahulu sebelum mengaktifkan acara.</p>}
            </section>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <section className="event-settings-history" style={{ marginTop: "20px" }}>
          <h3>Riwayat perubahan</h3>
          <p>Akses admin saat ini menggunakan sandi bersama, sehingga pelaku dicatat sebagai “admin”.</p>
          {audit.length > 0 ? (
            <ul style={{ listStyleType: "disc", paddingLeft: "20px" }}>
              {audit.map((row) => (
                <li key={row.id} style={{ padding: "6px 0" }}>
                  <strong>{row.created_at} UTC</strong> · {row.actor} · {auditLabels[row.action] || row.action}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#6b7280", fontStyle: "italic" }}>Belum ada perubahan tercatat.</p>
          )}
        </section>
      )}

      {["identity", "registration", "content", "assets", "branches"].includes(activeTab) && (
        <div style={{ marginTop: "20px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={busy} className="event-settings-primary">
            👁 Pratinjau perubahan
          </button>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() => void handleSaveSettings()}
            style={{
              backgroundColor: dirty ? "#1e5b38" : "#f3f4f6",
              color: dirty ? "#ffffff" : "#9ca3af",
              borderColor: dirty ? "#16452a" : "#d1d5db",
              cursor: dirty ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            {busy ? "Menyimpan…" : "💾 Simpan Pengaturan"}
          </button>
          {dirty && (
            <span style={{ fontSize: "13px", color: "#b45309", fontWeight: 500 }}>
              Ada perubahan yang belum disimpan.
            </span>
          )}
        </div>
      )}
    </form>
    {preview && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-preview-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setPreview(false);
        }}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#d0d6e0] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Modal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] bg-[#fafbfc]">
            <div>
              <h3 id="modal-preview-title" className="text-lg font-semibold text-[#2d2f36] m-0" style={{ fontSize: "17px", fontWeight: 600 }}>
                Pratinjau Perubahan Pengaturan
              </h3>
              <p className="text-xs text-[#8a8f98] m-0 mt-1" style={{ margin: "4px 0 0 0" }}>
                Periksa ringkasan pengaturan sebelum disimpan ke sistem
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="text-[#8a8f98] hover:text-[#2d2f36] rounded-md hover:bg-black/5 transition-colors cursor-pointer text-base"
              aria-label="Tutup pratinjau"
              style={{ minHeight: "auto", border: "none", margin: 0, padding: "6px 10px" }}
            >
              ✕
            </button>
          </div>

          {/* Isi Modal */}
          <div className="overflow-y-auto p-6 space-y-4 text-sm text-[#263e32]" style={{ maxHeight: "calc(90vh - 140px)" }}>
            <div className="bg-[#f7f9f6] p-4 rounded-lg border border-[#d8ddd1]">
              <h4 className="font-semibold text-base text-[#1b3024] m-0" style={{ fontSize: "16px", fontWeight: 600 }}>
                {draft.name} {draft.edition} · {draft.year}
              </h4>
              <p className="text-xs text-[#5e7058] m-0 mt-1 font-medium" style={{ margin: "4px 0 0 0" }}>
                {draft.district} · {draft.organizer} ({draft.region})
              </p>
              {draft.heroText && (
                <p className="m-0 mt-2 text-xs italic text-[#4b5563]" style={{ margin: "8px 0 0 0" }}>
                  "{draft.heroText}"
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Status Pendaftaran</span>
                <span className="font-semibold text-[#2d2f36] block mt-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                  {draft.registrationMode === "postponed" ? "Ditunda (Postponed)" : eventIsOpen(draft) ? "Dibuka" : "Ditutup"}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Acuan Usia Peserta</span>
                <span className="font-semibold text-[#2d2f36] block mt-1" style={{ fontSize: "14px", fontWeight: 600 }}>{draft.referenceDate}</span>
              </div>

              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Jadwal Pendaftaran (WIB)</span>
                <span className="text-xs text-[#2d2f36] block mt-1" style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  Mulai: {localDate(draft.opensAt).replace("T", " ") || "Tidak dibatasi"}<br />
                  Tutup: {localDate(draft.deadline).replace("T", " ") || "Tidak dibatasi"}
                </span>
              </div>

              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Cabang Lomba</span>
                <span className="font-semibold text-[#2d2f36] block mt-1" style={{ fontSize: "14px", fontWeight: 600 }}>{draft.branches.length} cabang aktif</span>
              </div>
            </div>

            {(draft.schedule || draft.venue) && (
              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Jadwal & Lokasi Pelaksanaan</span>
                <p className="text-xs text-[#2d2f36] m-0 mt-1" style={{ fontSize: "13px", margin: "4px 0 0 0" }}>{draft.schedule || "Jadwal belum ditentukan"} — {draft.venue || "Lokasi belum ditentukan"}</p>
              </div>
            )}

            {draft.announcement && (
              <div className="p-3 bg-[#fffbeb] border border-[#fde68a] rounded-md">
                <span className="block text-xs text-[#92400e] font-semibold" style={{ fontSize: "12px", color: "#92400e" }}>Pengumuman Publik</span>
                <p className="text-xs text-[#78350f] m-0 mt-1 whitespace-pre-line" style={{ fontSize: "13px", margin: "4px 0 0 0" }}>{draft.announcement}</p>
              </div>
            )}

            {draft.contact && (
              <div className="p-3 bg-white border border-[#e6e6e6] rounded-md">
                <span className="block text-xs text-[#8a8f98]" style={{ fontSize: "12px", color: "#8a8f98" }}>Kontak Panitia</span>
                <p className="text-xs text-[#2d2f36] m-0 mt-1 whitespace-pre-line" style={{ fontSize: "13px", margin: "4px 0 0 0" }}>{draft.contact}</p>
              </div>
            )}
          </div>

          {/* Footer Modal */}
          <div className="px-6 py-4 border-t border-[#e6e6e6] bg-[#fafbfc] flex items-center justify-end gap-3" style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="px-4 py-2 border border-[#d0d6e0] bg-white rounded text-[#2d2f36] hover:bg-gray-100 font-medium text-sm transition-colors cursor-pointer"
              style={{ minHeight: "40px", margin: 0, padding: "8px 16px", border: "1px solid #d0d6e0", borderRadius: "6px" }}
            >
              Kembali Mengedit
            </button>
            <button
              type="button"
              disabled={busy}
              className="px-5 py-2 bg-[#35533e] hover:bg-[#263e32] text-white rounded font-medium text-sm transition-colors cursor-pointer disabled:opacity-50"
              style={{ minHeight: "40px", margin: 0, padding: "8px 20px", backgroundColor: "#35533e", color: "white", border: "none", borderRadius: "6px", fontWeight: 600 }}
              onClick={() => void handleSaveSettings()}
            >
              {busy ? "Menyimpan…" : "Simpan Pengaturan"}
            </button>
          </div>
        </div>
      </div>
    )}

    {statusModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-status-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) setStatusModal(null);
        }}
      >
        <div
          className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#d0d6e0] overflow-hidden"
          style={{ maxWidth: "440px", width: "100%", padding: "28px 24px", textAlign: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          {statusModal.type === "success" ? (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                border: "2px solid #a7f3d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <svg style={{ width: "32px", height: "32px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#fff1f2",
                color: "#e11d48",
                border: "2px solid #fecdd3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <svg style={{ width: "32px", height: "32px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}

          <h3
            id="modal-status-title"
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: statusModal.type === "success" ? "#166534" : "#991b1b",
              margin: "0 0 8px 0",
            }}
          >
            {statusModal.title}
          </h3>

          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.5",
              color: "#4b5563",
              margin: "0 0 24px 0",
              whiteSpace: "pre-line",
            }}
          >
            {statusModal.message}
          </p>

          <button
            type="button"
            onClick={() => setStatusModal(null)}
            className="cursor-pointer"
            style={{
              width: "100%",
              minHeight: "42px",
              backgroundColor: statusModal.type === "success" ? "#35533e" : "#b91c1c",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "14px",
              padding: "10px 16px",
              margin: 0,
              cursor: "pointer",
            }}
          >
            {statusModal.type === "success" ? "Tutup" : "Mengerti / Periksa Kembali"}
          </button>
        </div>
      </div>
    )}

    {message && <p role="status" className="event-settings-message">{message}</p>}
  </div>;
}
