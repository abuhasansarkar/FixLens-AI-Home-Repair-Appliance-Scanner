import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { serviceReadiness } from "@/config/env";
import { convexApi } from "@/services/convex-references";

export type RepairStatus = "active" | "fixed" | "saved";
export type RepairGuideStep = { title: string; body: string; safety?: string };
export type RepairPart = { name: string; compatibilityNote: string };
export type RepairRecord = { id: string; appliance: string; issue: string; status: RepairStatus; currentStep: number; completedSteps: number[]; startedAt: number; completedAt?: number; fixed?: boolean; saved: boolean; notes?: string; actualCost?: number; actualMinutes?: number; difficulty?: string; safetyLevel?: string; likelyCauses?: {label:string;confidence:number}[]; observations?: string[]; assumptions?: string[]; estimatedMinutes?: { minimum: number; maximum: number }; estimatedCost?: { minimum: number; maximum: number; currency: string }; steps?: RepairGuideStep[]; tools?: string[]; parts?: RepairPart[]; sessionId?: string };
type StartInput = { appliance: string; issue: string; difficulty?: string; estimatedMinutes?: { minimum: number; maximum: number }; estimatedCost?: { minimum: number; maximum: number; currency: string }; steps?: RepairGuideStep[]; tools?: string[]; parts?: RepairPart[]; sessionId?: string };
type FinishDetails = { notes?: string; actualCost?: number; actualMinutes?: number };
type Remote = { begin?: (sessionId: string) => Promise<unknown>; completeStep?: (sessionId: string, step: number) => Promise<unknown>; finish?: (sessionId: string, fixed: boolean, details?: FinishDetails) => Promise<unknown>; save?: (sessionId: string) => Promise<unknown> };
type Value = { hydrated: boolean; repairs: RepairRecord[]; active: RepairRecord; canLoadMore: boolean; loadMore: () => void; activate: (id: string) => void; start: (input?: StartInput) => Promise<void>; completeStep: (step: number) => Promise<void>; setStep: (step: number) => void; finish: (fixed: boolean, details?: FinishDetails) => Promise<void>; save: () => Promise<void> };
const storageKey = "fixlens.repairs.v1";
const emptyRepair = (): RepairRecord => ({ id: "repair-" + Date.now(), appliance: "Appliance", issue: "Diagnosed issue", status: "active", currentStep: 1, completedSteps: [], startedAt: Date.now(), saved: false });
const RepairContext = createContext<Value | null>(null);

function RepairStateProvider({ children, remote = {}, remoteRecords, persistLocally = true, canLoadMore = false, loadMore = () => undefined }: PropsWithChildren<{ remote?: Remote; remoteRecords?: RepairRecord[]; persistLocally?: boolean; canLoadMore?: boolean; loadMore?: () => void }>) {
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [fallbackRepair] = useState(emptyRepair);
  const [hydrated, setHydrated] = useState(!persistLocally);
  useEffect(() => {
    if (!persistLocally) return;
    AsyncStorage.getItem(storageKey).then((value) => { if (value) { try { const saved=JSON.parse(value); if(Array.isArray(saved))setRepairs(saved); } catch { void AsyncStorage.removeItem(storageKey); } } }).finally(() => setHydrated(true));
  }, [persistLocally]);
  const displayedRepairs = useMemo(() => {
    const merged = remoteRecords
      ? [...repairs.filter((record) => !record.sessionId || !remoteRecords.some((remoteRecord) => remoteRecord.sessionId === record.sessionId)), ...remoteRecords]
      : repairs;
    if (!activeId) return merged;
    const selected = merged.find((item) => item.id === activeId);
    return selected ? [selected, ...merged.filter((item) => item.id !== activeId)] : merged;
  }, [activeId, remoteRecords, repairs]);
  const active = displayedRepairs[0] ?? fallbackRepair;
  const persist = useCallback((next: RepairRecord[]) => { setRepairs(next); if (persistLocally) void AsyncStorage.setItem(storageKey, JSON.stringify(next)); }, [persistLocally]);
  const update = useCallback((transform: (repair: RepairRecord) => RepairRecord) => { setRepairs((current) => { const source = current[0] ?? displayedRepairs[0] ?? emptyRepair(); const next = [transform(source), ...current.filter((item) => item.id !== source.id)]; if (persistLocally) void AsyncStorage.setItem(storageKey, JSON.stringify(next)); return next; }); }, [displayedRepairs, persistLocally]);
  const start = useCallback(async (input?: StartInput) => { if (input?.sessionId && remote.begin) await remote.begin(input.sessionId); const nextRepair = input ? { ...emptyRepair(), ...input } : { ...active, status: "active" as const, currentStep: Math.max(1, active.currentStep) }; setActiveId(nextRepair.id); persist([nextRepair, ...displayedRepairs.filter((item) => item.id !== nextRepair.id)]); }, [active, displayedRepairs, persist, remote]);
  const completeStep = useCallback(async (step: number) => { if (active.sessionId && remote.completeStep) await remote.completeStep(active.sessionId, step); update((repair) => ({ ...repair, completedSteps: repair.completedSteps.includes(step) ? repair.completedSteps : [...repair.completedSteps, step], currentStep: Math.min(repair.steps?.length ?? step + 1, step + 1) })); }, [active.sessionId, remote, update]);
  const finish = useCallback(async (fixed: boolean, details?: FinishDetails) => { if (active.sessionId && remote.finish) await remote.finish(active.sessionId, fixed, details); update((repair) => ({ ...repair, ...details, fixed, status: fixed ? "fixed" : "active", completedAt: fixed ? Date.now() : undefined, completedSteps: fixed ? repair.steps?.map((_, index) => index + 1) ?? repair.completedSteps : repair.completedSteps })); }, [active.sessionId, remote, update]);
  const save = useCallback(async () => { if (active.sessionId && remote.save) await remote.save(active.sessionId); update((repair) => ({ ...repair, saved: true, status: repair.fixed ? "fixed" : "saved" })); }, [active.sessionId, remote, update]);
  const value = useMemo<Value>(() => ({
    hydrated: persistLocally ? hydrated : remoteRecords !== undefined,
    repairs: displayedRepairs,
    active,
    canLoadMore,
    loadMore,
    activate: (id) => { if (displayedRepairs.some((item) => item.id === id)) setActiveId(id); },
    start,
    completeStep,
    setStep: (currentStep) => update((repair) => ({ ...repair, currentStep })),
    finish,
    save,
  }), [active, canLoadMore, completeStep, displayedRepairs, finish, hydrated, loadMore, persistLocally, remoteRecords, save, start, update]);
  return <RepairContext.Provider value={value}>{children}</RepairContext.Provider>;
}

function ConnectedRepairProvider({ children }: PropsWithChildren) {
  const { results: data, status, loadMore } = usePaginatedQuery(convexApi.repairs.list, {}, { initialNumItems: 20 });
  const begin = useMutation(convexApi.repairs.begin);
  const complete = useMutation(convexApi.repairs.completeStep);
  const finish = useMutation(convexApi.repairs.finish);
  const save = useMutation(convexApi.repairs.save);
  const remote = useMemo<Remote>(() => ({ begin: (sessionId) => begin({ sessionId }), completeStep: (sessionId, step) => complete({ sessionId, step }), finish: (sessionId, fixed, details) => finish({ sessionId, fixed, ...details }), save: (sessionId) => save({ sessionId }) }), [begin, complete, finish, save]);
  const remoteRecords = useMemo<RepairRecord[]>(() => data.map((item) => ({ id: String(item._id), sessionId: String(item.sessionId), appliance: String(item.appliance ?? "Appliance"), issue: String(item.issue ?? "Diagnosed issue"), status: item.status === "fixed" || item.status === "saved" ? item.status : "active", currentStep: Number(item.currentStep ?? 1), completedSteps: Array.isArray(item.completedSteps) ? item.completedSteps.filter((value): value is number => typeof value === "number") : [], startedAt: Number(item.startedAt ?? 0), completedAt: typeof item.completedAt === "number" ? item.completedAt : undefined, saved: Boolean(item.saved), fixed: item.outcome === "fixed", notes: typeof item.notes === "string" ? item.notes : undefined, actualCost: typeof item.actualCost === "number" ? item.actualCost : undefined, actualMinutes: typeof item.actualMinutes === "number" ? item.actualMinutes : undefined, difficulty: typeof item.difficulty === "string" ? item.difficulty : undefined, safetyLevel: typeof item.safetyLevel === "string" ? item.safetyLevel : undefined, likelyCauses: Array.isArray(item.likelyCauses) ? item.likelyCauses as {label:string;confidence:number}[] : [], observations: Array.isArray(item.observations) ? item.observations.filter((value):value is string=>typeof value==="string") : [], assumptions: Array.isArray(item.assumptions) ? item.assumptions.filter((value):value is string=>typeof value==="string") : [], estimatedMinutes: item.estimatedMinutes && typeof item.estimatedMinutes === "object" ? item.estimatedMinutes as { minimum: number; maximum: number } : undefined, estimatedCost: item.estimatedCost && typeof item.estimatedCost === "object" ? item.estimatedCost as { minimum: number; maximum: number; currency: string } : undefined, steps: Array.isArray(item.steps) ? item.steps as RepairGuideStep[] : [], tools: Array.isArray(item.tools) ? item.tools.filter((value): value is string => typeof value === "string") : [], parts: Array.isArray(item.parts) ? item.parts as RepairPart[] : [] })), [data]);
  return <RepairStateProvider remote={remote} remoteRecords={remoteRecords} persistLocally={false} canLoadMore={status === "CanLoadMore"} loadMore={() => loadMore(20)}>{children}</RepairStateProvider>;
}

export function RepairProvider({ children }: PropsWithChildren) {
  return serviceReadiness.authentication && serviceReadiness.backend ? <ConnectedRepairProvider>{children}</ConnectedRepairProvider> : <RepairStateProvider>{children}</RepairStateProvider>;
}
export function useRepair() { const value = useContext(RepairContext); if (!value) throw new Error("useRepair must be used within RepairProvider"); return value; }
