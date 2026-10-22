export async function request<T = any>(path: string, method = "GET", data?: unknown): Promise<T> {
  const res = await fetch(path,{method,credentials:"same-origin",headers:data===undefined?{}:{"Content-Type":"application/json"},body:data===undefined?undefined:JSON.stringify(data)});
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Permintaan tidak berhasil.");
  return result;
}
