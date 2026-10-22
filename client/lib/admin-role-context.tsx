

import { createContext, useContext } from "react";
import type { AdminRole } from "@shared/auth";

const AdminRoleContext = createContext<AdminRole | null>(null);

export function AdminRoleProvider({ role, children }: { role: AdminRole; children: React.ReactNode }) {
  return (
    <AdminRoleContext.Provider value={role}>
      {children}
    </AdminRoleContext.Provider>
  );
}

export function useAdminRole(): AdminRole {
  const role = useContext(AdminRoleContext);
  if (role === null) throw new Error("useAdminRole must be used within AdminRoleProvider");
  return role;
}
