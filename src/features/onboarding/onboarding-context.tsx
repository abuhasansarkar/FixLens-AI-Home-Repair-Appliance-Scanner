import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type DiyLevel = "beginner" | "comfortable" | "experienced";

type OnboardingState = {
  interests: string[];
  diyLevel: DiyLevel;
  safetyAccepted: boolean;
  completed: boolean;
};

type ServerOnboardingState = {
  onboardingComplete?: boolean;
  interests?: string[];
  diyLevel?: string;
} | null;

type OnboardingContextValue = OnboardingState & {
  hydrated: boolean;
  toggleInterest: (interest: string) => void;
  setDiyLevel: (level: DiyLevel) => void;
  acceptSafety: () => void;
  complete: () => Promise<void>;
};

const STORAGE_KEY_PREFIX = "fixlens.onboarding.v1";
const initialState: OnboardingState = {
  interests: ["appliances"],
  diyLevel: "beginner",
  safetyAccepted: false,
  completed: false,
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children, storageScope = "developer", serverState, serverLoading = false }: PropsWithChildren<{ storageScope?: string; serverState?: ServerOnboardingState; serverLoading?: boolean }>) {
  const [state, setState] = useState(initialState);
  const [localHydrated, setLocalHydrated] = useState(false);
  const storageKey = `${STORAGE_KEY_PREFIX}.${storageScope}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (stored) { try { setState({ ...initialState, ...JSON.parse(stored) }); } catch { void AsyncStorage.removeItem(storageKey); } }
      })
      .finally(() => setLocalHydrated(true));
  }, [storageKey]);

  const effectiveState = useMemo<OnboardingState>(() => serverState?.onboardingComplete ? {
    ...state,
    completed: true,
    safetyAccepted: true,
    interests: serverState.interests?.length ? serverState.interests : state.interests,
    diyLevel: serverState.diyLevel === "comfortable" || serverState.diyLevel === "experienced" ? serverState.diyLevel : "beginner",
  } : state, [serverState, state]);
  const hydrated = localHydrated && !serverLoading;
  useEffect(() => { if (hydrated) void AsyncStorage.setItem(storageKey, JSON.stringify(state)); }, [hydrated, state, storageKey]);

  const toggleInterest = useCallback((interest: string) => {
    setState((current) => {
      if (interest === "everything") {
        return { ...current, interests: ["everything"] };
      }
      const withoutEverything = current.interests.filter((item) => item !== "everything");
      const next = {
        ...current,
        interests: withoutEverything.includes(interest)
          ? withoutEverything.filter((item) => item !== interest)
          : [...withoutEverything, interest],
      };
      return next;
    });
  }, []);

  const setDiyLevel = useCallback((diyLevel: DiyLevel) => {
    setState((current) => ({ ...current, diyLevel }));
  }, []);

  const acceptSafety = useCallback(() => {
    setState((current) => ({ ...current, safetyAccepted: true }));
  }, []);

  const complete = useCallback(async () => {
    const next = { ...state, safetyAccepted: true, completed: true };
    setState(next);
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
  }, [state, storageKey]);

  const value = useMemo(
    () => ({ ...effectiveState, hydrated, toggleInterest, setDiyLevel, acceptSafety, complete }),
    [effectiveState, hydrated, toggleInterest, setDiyLevel, acceptSafety, complete],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used within OnboardingProvider");
  return value;
}
