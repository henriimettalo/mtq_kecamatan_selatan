import { SiteHeader, SiteFooter } from "@/components/MTQSiteShell";

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return <div className="mtq-site"><a className="mtq-skip" href="#akun-peserta">Langsung ke isi halaman</a><SiteHeader participant /><main id="akun-peserta" className="mtq-container mtq-account-main">{children}</main><SiteFooter /></div>;
}
