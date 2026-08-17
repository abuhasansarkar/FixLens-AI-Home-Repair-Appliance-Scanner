import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { serviceReadiness } from "@/config/env";
import { convexApi } from "@/services/convex-references";

export type Appliance = { id: string; name: string; brand: string; model: string; serial?: string; room: string; purchaseDate?: number; warrantyEndsAt?: number; notes?: string; scanSessionId?: string; hasImage?: boolean; condition: "good" | "attention" };
export type MaintenanceTask = { id: string; applianceId: string; title: string; dueAt: number; completed: boolean; instructions?: string[] };
export type MaintenanceRecord={id:string;applianceId?:string;title:string;completedAt:number;notes?:string};
type State = { appliances: Appliance[]; tasks: MaintenanceTask[]; history:MaintenanceRecord[] };
type AddInput = Omit<Appliance, "id" | "condition">;
type UpdateInput = Omit<Appliance, "id" | "condition">;
type Value = State & { hydrated: boolean; canAddAppliance: boolean; addAppliance: (input: AddInput) => Promise<Appliance>; updateAppliance: (id: string, input: UpdateInput) => Promise<void>; removeAppliance: (id: string) => Promise<void>; completeTask: (id: string) => Promise<void>; rescheduleTask: (id: string, nextDueAt: number) => Promise<void> };
const Context = createContext<Value | null>(null);
const key = "fixlens.home.v1";
const initial: State = { appliances: [], tasks: [], history:[] };

function LocalHomeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { AsyncStorage.getItem(key).then((value) => { if (value) { try { setState({ ...initial, ...JSON.parse(value) }); } catch { void AsyncStorage.removeItem(key); } } }).finally(() => setHydrated(true)); }, []);
  const save = useCallback((next: State) => { setState(next); void AsyncStorage.setItem(key, JSON.stringify(next)); }, []);
  const addAppliance = useCallback(async (input: AddInput) => { const appliance = { ...input, id: `appliance-${Date.now()}`, condition: "good" as const }; save({ ...state, appliances: [...state.appliances, appliance] }); return appliance; }, [save, state]);
  const completeTask = useCallback(async (id: string) => { const task=state.tasks.find((item)=>item.id===id);save({ ...state, tasks: state.tasks.map((item) => item.id === id ? { ...item, completed: true } : item),history:task?[{id:`history-${Date.now()}`,applianceId:task.applianceId,title:task.title,completedAt:Date.now()},...state.history]:state.history }); }, [save, state]);
  const updateAppliance = useCallback(async (id: string, input: UpdateInput) => { save({ ...state, appliances: state.appliances.map((item) => item.id === id ? { ...item, ...input } : item) }); }, [save, state]);
  const removeAppliance = useCallback(async (id: string) => { save({ appliances: state.appliances.filter((item) => item.id !== id), tasks: state.tasks.filter((item) => item.applianceId !== id),history:state.history.map((item)=>item.applianceId===id?{...item,applianceId:undefined}:item) }); }, [save, state]);
  const rescheduleTask = useCallback(async (id: string, nextDueAt: number) => { save({ ...state, tasks: state.tasks.map((item) => item.id === id ? { ...item, dueAt: nextDueAt } : item) }); }, [save, state]);
  const value = useMemo(() => ({ ...state, hydrated, canAddAppliance: true, addAppliance, updateAppliance, removeAppliance, completeTask, rescheduleTask }), [state, hydrated, addAppliance, updateAppliance, removeAppliance, completeTask, rescheduleTask]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function ConnectedHomeProvider({ children }: PropsWithChildren) {
  const data = useQuery(convexApi.appliances.list, {});
  const addRemote = useMutation(convexApi.appliances.add);
  const completeRemote = useMutation(convexApi.appliances.completeTask);
  const updateRemote = useMutation(convexApi.appliances.update);
  const removeRemote = useMutation(convexApi.appliances.remove);
  const rescheduleRemote = useMutation(convexApi.appliances.rescheduleTask);
  const appliances = (data?.appliances ?? []).map((item) => ({ id: String(item._id), name: String(item.name), brand: typeof item.brand === "string" ? item.brand : "", model: typeof item.model === "string" ? item.model : "", serial: typeof item.serial === "string" ? item.serial : undefined, room: typeof item.roomName === "string" ? item.roomName : "Home", purchaseDate: typeof item.purchaseDate === "number" ? item.purchaseDate : undefined, warrantyEndsAt: typeof item.warrantyEndsAt === "number" ? item.warrantyEndsAt : undefined, notes: typeof item.notes === "string" ? item.notes : undefined, hasImage: Boolean(item.imageStorageId), condition: "good" as const }));
  const tasks = (data?.tasks ?? []).map((item) => ({ id: String(item._id), applianceId: String(item.applianceId), title: String(item.title), dueAt: Number(item.nextDueAt), completed: item.status === "completed", instructions: Array.isArray(item.instructions) ? item.instructions.filter((value): value is string => typeof value === "string") : undefined }));
  const history=(data?.history??[]).map((item)=>({id:String(item._id),applianceId:typeof item.applianceId==="string"?item.applianceId:undefined,title:String(item.taskTitle),completedAt:Number(item.completedAt),notes:typeof item.notes==="string"?item.notes:undefined}));
  const addAppliance = useCallback(async (input: AddInput) => { const id = await addRemote({ name: input.name, brand: input.brand, model: input.model, serial: input.serial, room: input.room, scanSessionId: input.scanSessionId }); return { ...input, id, condition: "good" as const }; }, [addRemote]);
  const completeTask = useCallback(async (id: string) => { await completeRemote({ taskId: id }); }, [completeRemote]);
  const updateAppliance = useCallback(async (id: string, input: UpdateInput) => { await updateRemote({ applianceId: id, ...input }); }, [updateRemote]);
  const removeAppliance = useCallback(async (id: string) => { await removeRemote({ applianceId: id }); }, [removeRemote]);
  const rescheduleTask = useCallback(async (id: string, nextDueAt: number) => { await rescheduleRemote({ taskId: id, nextDueAt }); }, [rescheduleRemote]);
  const value = useMemo(() => ({ appliances, tasks, history, hydrated: data !== undefined, canAddAppliance: data?.canAddAppliance ?? false, addAppliance, updateAppliance, removeAppliance, completeTask, rescheduleTask }), [addAppliance, appliances, completeTask, data, history, removeAppliance, rescheduleTask, tasks, updateAppliance]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function HomeProvider({ children, connected = false }: PropsWithChildren<{ connected?: boolean }>) {
  const useBackend = serviceReadiness.authentication && serviceReadiness.backend && connected;
  return useBackend ? <ConnectedHomeProvider>{children}</ConnectedHomeProvider> : <LocalHomeProvider>{children}</LocalHomeProvider>;
}

export function useHome() { const value = useContext(Context); if (!value) throw new Error("useHome must be used within HomeProvider"); return value; }
