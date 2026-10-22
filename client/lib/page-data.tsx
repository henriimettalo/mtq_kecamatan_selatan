import { createContext, useContext } from "react";
import type { eventInfo } from "@shared/event-info";
import type { ParticipantRecord, AdminRole } from "@shared/types";
import type { ApiKeyItem } from "./actions";
export type EventInfo = ReturnType<typeof eventInfo>;
export interface PageData {
  event:EventInfo;active:EventInfo;role:AdminRole;participant:any;hidden:boolean;googleEnabled:boolean;
  participants:any[];records:ParticipantRecord[];keys:ApiKeyItem[];
  events:{results:{id:string;settings:string}[]};audit:{results:{id:number;action:string;actor:string;created_at:string}[]};
}
export const PageContext = createContext<PageData|null>(null);
export function usePageData() {
  const data = useContext(PageContext);if (!data) throw new Error("Data halaman belum tersedia.");return data;
}
