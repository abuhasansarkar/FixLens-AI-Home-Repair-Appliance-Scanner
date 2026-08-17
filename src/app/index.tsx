import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

import { env } from "@/config/env";
import { useOnboarding } from "@/features/onboarding/onboarding-context";

function AuthIndex() {
  const { isSignedIn, isLoaded } = useAuth();
  const { hydrated, completed } = useOnboarding();

  if (!isLoaded || !hydrated) return null;

  if (isSignedIn && completed) {
    return <Redirect href="/tabs/home" />;
  }

  if (isSignedIn && !completed) {
    return <Redirect href="/onboarding/scan" />;
  }

  return <Redirect href="/welcome" />;
}

function DevIndex() {
  const { hydrated, completed } = useOnboarding();
  if (!hydrated) return null;
  return <Redirect href={completed ? "/tabs/home" : "/welcome"} />;
}

export default function Index() {
  if (env.clerkPublishableKey) return <AuthIndex />;
  return <DevIndex />;
}
