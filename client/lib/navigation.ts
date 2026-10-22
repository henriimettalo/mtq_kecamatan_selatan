export function useRouter() {
  return {push:(url:string)=>window.location.assign(url),replace:(url:string)=>window.location.replace(url),refresh:()=>window.dispatchEvent(new Event("mtq:refresh"))};
}
export function redirect(url:string):never {window.location.replace(url);throw new Error("Mengalihkan halaman...");}
