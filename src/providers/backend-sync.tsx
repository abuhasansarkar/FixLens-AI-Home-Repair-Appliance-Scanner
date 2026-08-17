import { useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import type { PropsWithChildren } from "react";
import { useEffect, useRef } from "react";

import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { convexApi } from "@/services/convex-references";

export function BackendSync({ children }: PropsWithChildren) {
  const { user, isLoaded } = useUser();
  const onboarding = useOnboarding();
  const ensureCurrent = useMutation(convexApi.users.ensureCurrent);
  const completeOnboarding = useMutation(convexApi.users.completeOnboarding);
  const syncedIdentity = useRef<string | undefined>(undefined);
  const syncedOnboarding = useRef(false);

  useEffect(() => {
    if (!user) {
      syncedIdentity.current = undefined;
      syncedOnboarding.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isLoaded || !user || syncedIdentity.current === user.id) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    syncedIdentity.current = user.id;
    syncedOnboarding.current = false;
    void ensureCurrent({ email, name: user.fullName ?? undefined, avatarUrl: user.imageUrl || undefined }).catch(() => {
      syncedIdentity.current = undefined;
    });
  }, [ensureCurrent, isLoaded, user]);

  useEffect(() => {
    if (!onboarding.hydrated || !onboarding.completed || syncedOnboarding.current || !syncedIdentity.current) return;
    syncedOnboarding.current = true;
    void completeOnboarding({ interests: onboarding.interests, diyLevel: onboarding.diyLevel, safetyPolicyVersion: "safety-v1" }).catch(() => {
      syncedOnboarding.current = false;
    });
  }, [completeOnboarding, onboarding.completed, onboarding.diyLevel, onboarding.hydrated, onboarding.interests]);

  return children;
}
