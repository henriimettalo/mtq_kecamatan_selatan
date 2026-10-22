import { usePageData } from "@/lib/page-data";
import { logout } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { AdminRoleProvider } from "@/lib/admin-role-context";
import Link from "@/lib/link";

export default function ProtectedLayout({children}:{children:React.ReactNode}) {
  const {role}=usePageData();
  return (
    <AdminRoleProvider role={role}>
      <div className="min-h-screen bg-bg-marketing">
        <header
          className="sticky top-0 z-40 border-b bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#e6e6e6",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="admin-header-inner">
              <div className="flex items-center gap-3">
                <h1
                  className="text-text-primary"
                  style={{ fontSize: "16px", fontWeight: 510 }}
                >
                  Admin Panel — MTQ
                </h1>
                {role === "viewer" && (
                  <span
                    style={{
                      backgroundColor: "#fff3e0",
                      color: "#e65100",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 510,
                    }}
                  >
                    Hanya Lihat
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <Link href="/admin">Pendaftar</Link>
                {role === "admin" && <Link href="/admin/pengaturan">Pengaturan Acara</Link>}
                {role === "admin" && <Link href="/admin/api-keys">Manajemen API</Link>}
                <Link href="/" target="_blank">Lihat beranda</Link>
              </div>
              <form action={logout}>
                <Button
                  type="submit"
                  variant="ghost"
                  className="text-text-secondary hover:text-text-primary hover:bg-[#f3f4f5]"
                  style={{
                    fontSize: "14px",
                    fontWeight: 510,
                    border: "1px solid #d0d6e0",
                    borderRadius: "6px",
                  }}
                >
                  Keluar
                </Button>
              </form>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AdminRoleProvider>
  );
}
