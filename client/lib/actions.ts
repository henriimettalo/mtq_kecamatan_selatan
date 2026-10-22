import { request } from "./api";
export interface ApiKeyItem { id:number;name:string;key_prefix:string;scopes:string;created_by:string;last_used_at:string|null;revoked_at:string|null;created_at:string; }
export async function login(_previous: {error:string}|null, form: FormData) {
  try {
    const result = await request("/api/admin/login","POST",Object.fromEntries(form));
    window.location.assign(result.redirect); return null;
  } catch(error) {return {error:(error as Error).message};}
}
export async function logout() {
  const result = await request("/api/admin/logout","POST",{});window.location.assign(result.redirect);
}
export async function updateParticipantStatus(id:number,status:"approved"|"rejected"|"pending",rejectionReason?:string) {
  const result = await request(`/api/admin/participants/${id}/status`,"PATCH",{status,rejectionReason});
  window.location.assign(result.redirect);
}
export const saveEventSettings = (id:string,revision:number,settings:unknown):Promise<{revision:number}> => request(`/api/admin/events/${encodeURIComponent(id)}`,"PUT",{revision,settings});
export const copyEventSettings = (id:string,year:number):Promise<{id:string}> => request(`/api/admin/events/${encodeURIComponent(id)}/copy`,"POST",{year});
export const activateEvent = (id:string) => request(`/api/admin/events/${encodeURIComponent(id)}/activate`,"POST",{});
export async function setParticipantDataVisibility(form:FormData) {
  try {
    await request(`/api/admin/events/${encodeURIComponent(String(form.get("eventId")))}/visibility`,"POST",{hidden:form.get("hidden")==="true"});
    window.dispatchEvent(new Event("mtq:refresh"));
  } catch(error) { window.alert((error as Error).message); }
}
export const fetchApiKeys = ():Promise<ApiKeyItem[]> => request("/api/admin/api-keys");
export const generateNewApiKey = (name:string,scopes:string[]) => request("/api/admin/api-keys","POST",{name,scopes});
export const rotateApiKeyAction = (id:number) => request(`/api/admin/api-keys/${id}/rotate`,"POST",{});
export const revokeApiKeyAction = (id:number) => request(`/api/admin/api-keys/${id}/revoke`,"POST",{});
export const deleteApiKeyAction = (id:number) => request(`/api/admin/api-keys/${id}`,"DELETE");
