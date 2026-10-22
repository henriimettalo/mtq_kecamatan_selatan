import { usePageData } from "@/lib/page-data";
import { redirect } from "@/lib/navigation";

import { ApiKeyManager } from "@/components/ApiKeyManager";


export default function ApiKeysPage() {
  const {keys}=usePageData();
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#1b3024", margin: "0 0 6px 0" }}>
          Manajemen Kunci API (Integrasi)
        </h2>
        <p style={{ margin: 0, fontSize: "14px", color: "#5c675e" }}>
          Kelola hak akses dan integrasi REST API data peserta MTQ untuk instansi dinas, kementerian, atau aplikasi pihak ketiga.
        </p>
      </div>

      <ApiKeyManager initialKeys={keys} />
    </div>
  );
}
