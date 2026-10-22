import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PageContext, type PageData } from "./lib/page-data";
import Home from "./pages/home";
import Closed from "./pages/closed";
import Success from "./pages/success";
import Participant from "./pages/participant";
import ParticipantLogin from "./pages/participant-login";
import ParticipantLayout from "./pages/participant-layout";
import Admin from "./pages/admin";
import Detail from "./pages/detail";
import Settings from "./pages/settings";
import ApiKeys from "./pages/api-keys";
import AdminLogin from "./pages/admin-login";
import AdminLayout from "./pages/admin-layout";
import { RegistrationForm } from "./components/RegistrationForm";
import "./styles/globals.css";
import "./styles/mtq.css";
import "./styles/event-settings.css";
const path = window.location.pathname.replace(/\/$/,"") || "/";
function App() {
  const [data,setData] = useState<PageData|null>(null), [error,setError] = useState("");
  const [revision,setRevision] = useState(0);
  let page = ({"/":"home","/daftar":"register","/ditutup":"closed","/sukses":"success","/peserta":"participant","/peserta/login":"participant-login","/admin":"admin","/admin/pengaturan":"settings","/admin/api-keys":"api-keys"} as Record<string,string>)[path];
  const detail = path.match(/^\/admin\/(\d+)$/);
  if (detail) page="detail";
  useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener("mtq:refresh",refresh);return()=>window.removeEventListener("mtq:refresh",refresh);},[]);
  useEffect(()=>{
    if (!page) return;
    let cancelled=false;
    const params=new URLSearchParams(window.location.search);params.set("page",page);
    if (detail) params.set("id",detail[1]);
    fetch(`/api/page?${params}`,{credentials:"same-origin"}).then(async res=>{
      const result = await res.json();
      if (res.status===401 && path.startsWith("/admin")) return window.location.replace("/admin/login");
      if (!res.ok) throw new Error(result.error||"Data tidak dapat dimuat.");
      if (result.redirect) return window.location.replace(result.redirect);
      if (!cancelled) {setData(result);setError("");document.title=`MTQ ${result.event?.edition||""} ${result.event?.year||""}`;}
    }).catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;};
  },[page,revision]);
  if (path==="/admin/login") return <AdminLogin/>;
  if (!page) return <main className="p-8"><h1>Halaman tidak ditemukan</h1><a href="/">Kembali ke beranda</a></main>;
  if (error) return <main className="p-8" role="alert"><h1>Halaman belum dapat dimuat</h1><p>{error}</p><button onClick={()=>{setError("");setRevision(n=>n+1);}}>Coba lagi</button> <a href="/">Beranda</a></main>;
  if (!data) return <main className="p-8" role="status">Memuat halaman MTQ...</main>;
  let content:React.ReactNode;
  switch(page) {
    case "home":content=<Home/>;break;
    case "closed":content=<Closed/>;break;
    case "success":content=<Success/>;break;
    case "participant":content=<Participant/>;break;
    case "participant-login":content=<ParticipantLogin/>;break;
    case "admin":content=<Admin/>;break;
    case "detail":content=<Detail/>;break;
    case "settings":content=<Settings/>;break;
    case "api-keys":content=<ApiKeys/>;break;
    case "register":content=<RegistrationForm key={`${data.event.id}-${data.event.revision}`} referenceDate={data.event.referenceDate} branchDefinitions={data.event.branches} eventId={data.event.id} eventName={`${data.event.name} ${data.event.edition} ${data.event.year}`} statementTemplateUrl={data.event.statementTemplate}/>;break;
  }
  if (["participant","participant-login"].includes(page)) content=<ParticipantLayout>{content}</ParticipantLayout>;
  if (["admin","detail","settings","api-keys"].includes(page)) content=<AdminLayout>{content}</AdminLayout>;
  return <PageContext.Provider value={data}>{content}</PageContext.Provider>;
}
createRoot(document.getElementById("root")!).render(<App/>);
