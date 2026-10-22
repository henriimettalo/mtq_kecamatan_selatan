import Image from "@/lib/image";
import Link from "@/lib/link";
import { usePageData } from "@/lib/page-data";

export function SiteHeader({ participant = false }: { participant?: boolean }) {
  const {event}=usePageData();
  return (
    <header className="mtq-header-wrapper">
      <div className="mtq-header mtq-container">
        <Link href="/" className="mtq-brand" aria-label={`${event.name}, beranda`}>
          <div className="mtq-brand-logos">
            <Image unoptimized src={event.organizerLogo} width={34} height={42} alt={`Logo MTQ / ${event.organizer}`} />
            <Image unoptimized src={event.logo} width={32} height={42} alt="Logo Pemerintah Kota Pontianak" />
            <Image unoptimized src={event.districtLogo} width={46} height={42} alt="Logo Pesona Kota Pontianak" />
          </div>
          <span>MTQ <span className="mtq-brand-year">{event.year}</span><small>{event.district}</small></span>
        </Link>
        <nav aria-label="Navigasi utama" className="mtq-navigation">
          <a href="/#cabang">Cabang lomba</a>
          <a href="/#persyaratan">Persyaratan</a>
          <a href="/#informasi">Informasi</a>
        </nav>
        <Link href={participant ? "/" : "/peserta/login"} className="mtq-header-login">
          {participant ? "Beranda" : "Masuk peserta"}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const {event}=usePageData();
  return <footer className="mtq-footer mtq-container"><p><strong>MTQ {event.edition} Tahun {event.year}</strong><span>{event.district}</span></p><a href="/#persyaratan">Panduan pendaftaran</a><p className="mtq-footer-location">{event.region}</p></footer>;
}
