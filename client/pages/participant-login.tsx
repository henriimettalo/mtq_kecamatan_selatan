import { usePageData } from "@/lib/page-data";
import Link from "@/lib/link";
import { safeReturnPath } from "@/lib/return-path";

import { GoogleSignInLink } from "@/components/GoogleSignInLink";


const messages: Record<string, string> = {
  configuration: "Masuk dengan Google belum tersedia. Silakan coba kembali setelah diaktifkan oleh panitia.",
  cancelled: "Proses masuk belum selesai. Silakan coba kembali dengan akun Google Anda.",
  failed: "Proses masuk belum berhasil. Silakan coba kembali.",
};

export default function ParticipantLogin() {
  const {event,googleEnabled:config}=usePageData();
  const params=Object.fromEntries(new URLSearchParams(window.location.search));
  const returnTo=safeReturnPath(params.next);
  const message = !config ? messages.configuration : params.error ? messages[params.error] ?? messages.failed : null;
  return <div className="mtq-login-panel">
    <p className="mtq-eyebrow">MTQ {event.edition} {event.year} · {event.district}</p>
    <h1>Akun <em>peserta.</em></h1>
    <p className="mtq-account-intro">Simpan perjalanan musabaqah Anda dalam satu tempat. Masuk untuk melihat status dan riwayat pendaftaran.</p>
    {message && <p className="mtq-account-notice" role="status">{message}</p>}
    {config && <GoogleSignInLink href={`/api/auth/google?next=${encodeURIComponent(returnTo)}`} />}
    <p className="mtq-password-note">Gunakan akun Google yang sama setiap kali masuk.<br />Panitia tidak menerima atau menyimpan sandi Google Anda.</p>
    {!config && event.isOpen && <Link href="/daftar" className="mtq-button mtq-button-outline">Lanjut ke pendaftaran</Link>}
    <div><Link className="mtq-account-back" href="/">Kembali ke beranda</Link></div>
  </div>;
}
