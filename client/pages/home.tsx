import { usePageData } from "@/lib/page-data";
import Image from "@/lib/image";
import Link from "@/lib/link";
import { type BranchDefinition } from "@shared/branches";
import { formatEventDate, formatEventDateTime } from "@/lib/event-info";
import { SiteHeader, SiteFooter } from "@/components/MTQSiteShell";
import { HomeMotion } from "@/components/HomeMotion";


const groups = [
  { name: "Tartil & Tilawah", description: "Keindahan bacaan, ketepatan tajwid, dan penghayatan ayat.", ids: ["tartil", "tilawah-anak", "tilawah-remaja", "tilawah-dewasa", "usia-emas"] },
  { name: "Qira’at", description: "Tradisi seni membaca Al-Qur’an melalui ragam qira’at.", ids: ["qiraat-murattal-remaja", "qiraat-murattal-dewasa", "qiraat-mujawwad-dewasa"] },
  { name: "Hafalan Al-Qur’an", description: "Menjaga ayat dalam ingatan, mulai dari satu hingga tiga puluh juz.", ids: ["hafalan-1-juz", "hafalan-5-juz", "hafalan-10-juz", "hafalan-20-juz", "hafalan-30-juz"] },
  { name: "Fahmil & Syarhil Qur’an", description: "Memahami makna dan menyampaikan pesan Al-Qur’an.", ids: ["fahmil-quran", "syarhil-quran"] },
];

function ageLimit(branch: BranchDefinition) {
  if (branch.maxAgeYears === undefined && branch.minAgeYears === undefined) return "Tanpa batas usia";
  return [branch.minAgeYears !== undefined ? `Minimal ${branch.minAgeYears} tahun` : "", branch.maxAgeYears !== undefined ? `Maksimal ${branch.maxAgeYears} tahun ${branch.maxAgeMonths ?? 0} bulan ${branch.maxAgeDays ?? 0} hari` : ""].filter(Boolean).join(" · ");
}

export default function HomePage() {
  const {event} = usePageData();
  const isPostponed = event.registrationMode === "postponed";
  const registrationStatus = isPostponed ? "Pendaftaran ditunda" : event.isOpen ? "Pendaftaran dibuka" : "Pendaftaran ditutup";
  const registrationTiming = isPostponed
    ? "Jadwal baru menunggu pengumuman panitia."
    : event.deadline
      ? `Batas pendaftaran ${formatEventDateTime(event.deadline)}`
      : "Batas waktu belum diumumkan.";
  const displayGroups = [...groups, { name: "Cabang lainnya", description: "Cabang tambahan yang ditetapkan panitia.", ids: event.branches.filter(b => !groups.some(g => g.ids.includes(b.id))).map(b => b.id) }].filter(g => event.branches.some(b => g.ids.includes(b.id)));
  return (
    <div className="mtq-site">
      <a href="#konten" className="mtq-skip">Langsung ke isi halaman</a>
      <SiteHeader />
      <main id="konten">
        <section className="mtq-hero mtq-container" aria-labelledby="judul-mtq">
          <div className="mtq-hero-copy">
            <p className="mtq-eyebrow">MTQ {event.edition} · Tahun {event.year}</p>
            <h1 id="judul-mtq">{event.name}</h1>
            <p className="mtq-hero-place">{event.district}</p>
            <p className="mtq-hero-description">{event.heroText}</p>
            {isPostponed && (
              <div className="mtq-banner-postponed" role="status">
                <strong>Pelaksanaan dan pendaftaran ditunda</strong>
                <p>Panitia akan mengumumkan jadwal terbaru. Sementara itu, Anda dapat mempelajari cabang lomba dan menyiapkan berkas.</p>
              </div>
            )}
            <div className="mtq-hero-actions">
              <Link href={event.isOpen ? "/daftar" : "#informasi"} className="mtq-button mtq-button-primary">{event.isOpen ? "Daftar peserta" : "Lihat informasi lomba"}</Link>
              <a href="#cabang" className="mtq-text-link">Kenali cabang lomba <span aria-hidden="true">↗</span></a>
            </div>
            {!isPostponed && <div className="mtq-registration-note">
              <span className={`mtq-status-dot ${event.isOpen ? "mtq-status-open" : ""}`} aria-hidden="true" />
              <p><strong>{registrationStatus}</strong><span>{registrationTiming}</span></p>
            </div>}
          </div>
          <figure className="mtq-hero-figure">
            <div className="mtq-hero-image-frame">
              <Image src="/images/mtq-morning.webp" alt="Ilustrasi Al-Qur’an di atas rehal kayu dengan cahaya pagi dari jendela" fill priority sizes="(max-width: 800px) 90vw, 46vw" className="mtq-hero-image" />
            </div>
            <figcaption>Ilustrasi suasana mengaji · Cahaya, ketenangan, dan lantunan ayat</figcaption>
          </figure>
        </section>
        <section id="cabang" className="mtq-section mtq-container" aria-labelledby="judul-cabang">
          <div className="mtq-section-heading" data-reveal>
            <h2 id="judul-cabang">Cabang lomba</h2>
            <p>Setiap cabang memiliki ketentuan usia. Buka rincian di bawah untuk memilih cabang yang sesuai.</p>
          </div>
          <div className="mtq-branch-list">
            {displayGroups.map((group, index) => (
              <details key={group.name} className="mtq-branch" data-reveal>
                <summary><span className="mtq-branch-number">0{index + 1}</span><span className="mtq-branch-summary"><span className="mtq-branch-title">{group.name}</span><span className="mtq-branch-description">{group.description}</span></span><span className="mtq-expand-mark" aria-hidden="true" /></summary>
                <div className="mtq-branch-content">
                  {event.branches.filter((branch) => group.ids.includes(branch.id)).map((branch) => <div key={branch.id} className="mtq-branch-option"><h3>{branch.name}</h3><p>{ageLimit(branch)}</p><p>{branch.description}</p></div>)}
                  <p className="mtq-branch-reference">Usia dihitung pada {formatEventDate(event.referenceDate)}. Kelayakan usia juga diperiksa saat mengisi formulir.</p>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section id="persyaratan" className="mtq-preparation" aria-labelledby="judul-persiapan">
          <div className="mtq-container mtq-preparation-grid">
            <div data-reveal><h2 id="judul-persiapan">Persyaratan peserta</h2><p className="mtq-section-description">Siapkan data dan berkas berikut sebelum mengisi formulir pendaftaran.</p><a className="mtq-button mtq-button-outline" href={event.statementTemplate} download>Unduh surat pernyataan <span aria-hidden="true">↓</span></a><p className="mtq-download-note">Template PDF untuk diisi dan diunggah saat mendaftar.</p></div>
            <ol className="mtq-requirement-list" data-reveal>
              <li><span>01</span><div><h3>Data diri peserta</h3><p>NIK, tempat dan tanggal lahir, alamat, serta nomor WhatsApp yang aktif.</p></div></li>
              <li><span>02</span><div><h3>Dokumen identitas</h3><p>Kartu Keluarga, KTP, dan akta kelahiran. Untuk peserta di bawah 17 tahun, gunakan KK sebagai pengganti KTP.</p></div></li>
              <li><span>03</span><div><h3>Surat pernyataan</h3><p>Unduh template, lengkapi isinya, lalu unggah bersama dokumen lainnya.</p></div></li>
            </ol>
          </div>
        </section>
        <section id="informasi" className="mtq-section mtq-container" aria-labelledby="judul-informasi">
          <div className="mtq-section-heading" data-reveal><h2 id="judul-informasi">Jadwal & pengumuman</h2><p>Informasi pendaftaran dan pelaksanaan yang perlu diketahui peserta.</p></div>
          <dl className="mtq-event-info" data-reveal>
            <div><dt>Pendaftaran peserta</dt><dd><strong className={isPostponed ? "mtq-registration-postponed" : undefined}>{registrationStatus}</strong>{!isPostponed && event.opensAt && <span>Mulai {formatEventDateTime(event.opensAt)}</span>}<span>{registrationTiming}</span></dd></div>
            <div><dt>Acuan usia peserta</dt><dd><strong>{formatEventDate(event.referenceDate)}</strong><span>Digunakan untuk menentukan kelayakan cabang lomba.</span></dd></div>
            <div><dt>Jadwal & lokasi lomba</dt><dd><strong>{isPostponed ? "Menunggu pengumuman panitia" : event.schedule || "Belum diumumkan di situs ini"}</strong><span>{event.venue || "Lokasi akan diumumkan oleh panitia."}</span></dd></div>
            {event.announcement && <div><dt>Pengumuman</dt><dd style={{ whiteSpace: "pre-line" }}>{event.announcement}</dd></div>}
            {event.contact && <div><dt>Kontak panitia</dt><dd style={{ whiteSpace: "pre-line" }}>{event.contact}</dd></div>}
          </dl>
        </section>
        <section className="mtq-invitation" aria-labelledby="judul-ajakan">
          <div className="mtq-container mtq-invitation-content" data-reveal><h2 id="judul-ajakan">Cek status pendaftaran</h2><p>Masuk untuk melihat status dan riwayat pendaftaran yang terhubung dengan akun Anda.</p><Link href="/peserta/login" className="mtq-button mtq-button-primary">Masuk ke akun peserta</Link></div>
        </section>
      </main>
      <SiteFooter />
      <HomeMotion />
    </div>
  );
}
