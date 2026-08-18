import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { env } from "@/config/env";

export type ScanImage = { uri: string; purpose: "problem" | "label" | "evidence"; width: number; height: number; mime: "image/jpeg" };
type ScanState = { images: ScanImage[]; description: string; clarification?: string; sessionId?: string; uploadedImageCount: number };
type Action = { type: "addImage"; image: ScanImage } | { type: "description"; value: string } | { type: "clarification"; value: string } | { type: "session"; sessionId: string } | { type: "uploaded" } | { type: "hydrate"; state: ScanState } | { type: "reset" };
const initialState: ScanState = { images: [], description: "", uploadedImageCount: 0 };

function reducer(state: ScanState, action: Action): ScanState {
  switch (action.type) {
    case "addImage": return state.images.length >= 3 ? state : { ...state, images: [...state.images, action.image] };
    case "description": return { ...state, description: action.value.slice(0, 300) };
    case "clarification": return { ...state, clarification: action.value };
    case "session": return { ...state, sessionId: action.sessionId };
    case "uploaded": return { ...state, uploadedImageCount: Math.min(state.images.length, state.uploadedImageCount + 1) };
    case "hydrate": return action.state;
    case "reset": return initialState;
  }
}

type ScanContextValue = ScanState & { addImage: (uri: string, purpose?: ScanImage["purpose"]) => Promise<void>; setDescription: (value: string) => void; setClarification: (value: string) => void; setSession: (sessionId: string) => void; markUploaded: () => void; reset: () => void };
const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children, storageScope }: PropsWithChildren<{ storageScope: string }>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  const storageKey = `fixlens.scan.v1.${storageScope}`;
  useEffect(() => { AsyncStorage.getItem(storageKey).then((value) => { if (value) { try { const saved = JSON.parse(value) as ScanState; dispatch({ type: "hydrate", state: { ...initialState, ...saved, images: Array.isArray(saved.images) ? saved.images.slice(0, 3) : [] } }); } catch { void AsyncStorage.removeItem(storageKey); } } }).finally(() => setHydrated(true)); }, [storageKey]);
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(storageKey, JSON.stringify(state)); }, [hydrated, state, storageKey]);
  const addImage = useCallback(async (uri: string, purpose: ScanImage["purpose"] = "problem") => {
    if (state.images.length >= 3) {
      if (purpose === "problem") {
        dispatch({ type: "reset" });
      } else {
        throw new Error("A diagnosis can include at most three images.");
      }
    }
    const inspected = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
    const resize = Math.max(inspected.width, inspected.height) > env.maxImageLongEdge ? [{ resize: inspected.width >= inspected.height ? { width: env.maxImageLongEdge } : { height: env.maxImageLongEdge } }] : [];
    const optimized = await ImageManipulator.manipulateAsync(inspected.uri, resize, { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
    dispatch({ type: "addImage", image: { uri: optimized.uri, purpose, width: optimized.width, height: optimized.height, mime: "image/jpeg" } });
  }, [state.images.length]);
  const value = useMemo(() => ({ ...state, addImage, setDescription: (value: string) => dispatch({ type: "description", value }), setClarification: (value: string) => dispatch({ type: "clarification", value }), setSession: (sessionId: string) => dispatch({ type: "session", sessionId }), markUploaded: () => dispatch({ type: "uploaded" }), reset: () => { dispatch({ type: "reset" }); void AsyncStorage.removeItem(storageKey); } }), [state, addImage, storageKey]);
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan() {
  const value = useContext(ScanContext);
  if (!value) throw new Error("useScan must be used within ScanProvider");
  return value;
}
