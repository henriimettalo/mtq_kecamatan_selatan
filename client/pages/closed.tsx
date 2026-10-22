import { usePageData } from "@/lib/page-data";
import Link from "@/lib/link";
import { formatEventDateTime } from "@/lib/event-info";



export default function DitutupPage() {
  const {event} = usePageData();
  const {deadline,isOpen,name,year,district,registrationMode}=event;
  const isPostponed = registrationMode === "postponed";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-marketing px-4">
      <div className="w-full max-w-[640px] rounded-panel border border-[#d0d6e0] bg-white p-8">
        <h1 className="text-[32px] font-normal leading-[1.13] tracking-heading-1 text-text-primary">
          {isPostponed ? "Pendaftaran Ditunda" : "Pendaftaran Ditutup"}
        </h1>
        <p className="mt-4 text-base text-text-secondary">
          {isPostponed
            ? `Pendaftaran ${name} ${year} ${district} saat ini sedang ditunda. Informasi mengenai jadwal terbaru akan diumumkan oleh panitia.`
            : `Pendaftaran ${name} ${year} ${district} saat ini tidak dibuka. Terima kasih atas partisipasi Anda.`}
        </p>
        {!isPostponed && deadline && (
          <p className="mt-4 text-base text-text-tertiary">
            Batas pendaftaran: {formatEventDateTime(deadline)}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-6 text-sm"><Link href="/">Kembali ke beranda</Link><Link href="/peserta/login">Masuk peserta</Link></div>
      </div>
    </div>
  );
}
