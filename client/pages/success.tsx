import { usePageData } from "@/lib/page-data";

import { maskNik } from "@shared/data-masking";

interface SearchParams {
  id?: string;
  token?: string;
}

export default function SuccessPage() {
  const {event,participant,hidden}=usePageData();
  if (hidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-marketing px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-[640px] rounded-panel border border-[#d0d6e0] bg-white p-8">
          <h1 className="text-[28px] font-normal leading-[1.13] tracking-heading-1 text-text-primary">Data pendaftaran tidak ditampilkan</h1>
          <p className="mt-3 text-base text-text-secondary">Informasi peserta untuk acara yang telah berlalu atau disembunyikan panitia tidak lagi ditampilkan di halaman ini.</p>
          <a href="/" className="mt-6 inline-flex rounded-comfortable bg-brand-indigo px-4 py-2 text-base font-medium text-white">Kembali ke beranda</a>
        </div>
      </div>
    );
  }

  const cabangName = participant.branch_name || event.branches.find(b=>b.id===participant.cabang)?.name || participant.cabang;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-marketing px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-[640px] rounded-panel border border-[#d0d6e0] bg-white p-8">
        <div className="mb-8">
          <h1
            className="text-[32px] font-normal leading-[1.13] tracking-heading-1 text-text-primary"
            style={{ fontFeatureSettings: '"cv01", "ss03"' }}
          >
            <span className="text-emerald-600">✅</span> Sukses Mendaftar
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Pendaftaran Anda berhasil. Berikut adalah informasi data peserta.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <p
              className="text-sm font-medium tracking-caption text-text-secondary"
              style={{ fontFeatureSettings: '"cv01", "ss03"' }}
            >
              Nama
            </p>
            <p className="text-base text-text-primary">{participant.nama}</p>
          </div>

          <div>
            <p
              className="text-sm font-medium tracking-caption text-text-secondary"
              style={{ fontFeatureSettings: '"cv01", "ss03"' }}
            >
              NIK
            </p>
            <p className="text-base text-text-primary">{maskNik(participant.nik)}</p>
          </div>

          <div>
            <p
              className="text-sm font-medium tracking-caption text-text-secondary"
              style={{ fontFeatureSettings: '"cv01", "ss03"' }}
            >
              Nomor WhatsApp
            </p>
            <p className="text-base text-text-primary">
              {participant.nomor_whatsapp}
            </p>
          </div>

          <div>
            <p
              className="text-sm font-medium tracking-caption text-text-secondary"
              style={{ fontFeatureSettings: '"cv01", "ss03"' }}
            >
              Cabang Lomba
            </p>
            <p className="text-base text-text-primary">{cabangName}</p>
          </div>
        </div>

        <div className="mt-8">
          <a href="/peserta" className="mb-4 flex w-full items-center justify-center rounded-comfortable bg-brand-indigo px-4 py-2 text-base font-medium text-white">Lihat akun peserta</a>
          <a
            href="/daftar"
            className="flex w-full items-center justify-center rounded-comfortable border border-[#d0d6e0] bg-[#f3f4f5] px-4 py-2 text-base font-medium text-text-secondary transition-colors hover:bg-[#e8e9ea]"
          >
            Daftar Lagi
          </a>
        </div>
      </div>
    </div>
  );
}
