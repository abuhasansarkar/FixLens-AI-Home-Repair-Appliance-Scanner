import { useSignIn, useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Apple, Mail } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Header } from "@/components/ui/header";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { env, serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { authenticationErrorMessage, isAuthenticationCancellation } from "@/utils/auth-errors";

function AuthLayout({
  onEmail,
  onApple,
  onGoogle,
  loading,
  error,
}: {
  onEmail: (email: string, password: string) => void;
  onApple: () => void;
  onGoogle: () => void;
  loading: boolean;
  error?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AppScreen keyboard>
      <Header />
      <View className="mt-3 items-center">
        <BrandMark variant="icon" />
        <AppText variant="display" align="center" className="mt-[18px]">Welcome to{"\n"}FixLens</AppText>
        <AppText variant="body" color={colors.muted} className="mt-2">Smarter repairs. Safer results.</AppText>
      </View>

      <View className="mt-7 gap-3">
        <Button
          label="Continue with Google"
          variant="secondary"
          icon={<GoogleIcon size={20} />}
          onPress={onGoogle}
          loading={loading}
        />
        <Button
          label="Continue with Apple"
          variant="secondary"
          icon={<Apple color={colors.ink} size={20} />}
          onPress={onApple}
          loading={loading}
        />
      </View>

      <View className="my-6 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-line dark:bg-dark-line" />
        <AppText variant="caption">or continue with email</AppText>
        <View className="h-px flex-1 bg-line dark:bg-dark-line" />
      </View>

      <View className="gap-3">
        <TextField kind="email" placeholder="Email address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextField kind="password" placeholder="Password" value={password} onChangeText={setPassword} />
        {error ? <AppText variant="caption" color={colors.danger}>{error}</AppText> : null}
        <Button label="Sign In" icon={<Mail color={colors.white} size={18} />} disabled={!email || !password} loading={loading} onPress={() => onEmail(email.trim(), password)} />
      </View>

      <Pressable className="min-h-11 items-center justify-center" onPress={() => router.push("/auth/forgot-password")}>
        <AppText variant="label" color={colors.brand}>Forgot password?</AppText>
      </Pressable>
      <View className="flex-row items-center justify-center py-3">
        <AppText variant="caption">Don’t have an account? </AppText>
        <Pressable onPress={() => router.push("/auth/sign-up")}>
          <AppText variant="label" color={colors.brand}>Create one</AppText>
        </Pressable>
      </View>
      <View className="mt-auto flex-row justify-center gap-5 pt-8">
        <Pressable onPress={() => router.push("/legal/terms")}><AppText variant="caption" color={colors.brand}>Terms</AppText></Pressable>
        <AppText variant="caption">•</AppText>
        <Pressable onPress={() => router.push("/legal/privacy")}><AppText variant="caption" color={colors.brand}>Privacy</AppText></Pressable>
      </View>
    </AppScreen>
  );
}

function ConfiguredSignIn() {
  const router = useRouter();
  const { completed } = useOnboarding();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [socialLoading, setSocialLoading] = useState(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const finalizeSocial = async (sessionId: string | null | undefined, setActive?: (params: { session: string }) => Promise<void>) => {
    if (!sessionId || !setActive) {
      return;
    }
    await setActive({ session: sessionId });
    router.replace(completed ? "/tabs/home" : "/onboarding/scan");
  };

  const emailSignIn = async (emailAddress: string, password: string) => {
    setLocalError(undefined);
    try {
      const { error } = await signIn.password({ emailAddress, password });
      if (error) {
        setLocalError(error.message || "Invalid email address or password.");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: () => router.replace(completed ? "/tabs/home" : "/onboarding/scan") });
      }
    } catch (err) {
      setLocalError(authenticationErrorMessage(err));
    }
  };

  const social = async (provider: "apple" | "google") => {
    setLocalError(undefined);
    setSocialLoading(true);
    try {
      const redirectUrl = Linking.createURL("sso-callback", {
        scheme: "fixlens",
      });
      const strategy = provider === "apple" ? "oauth_apple" : "oauth_google";
      const { createdSessionId, setActive, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      const sessionId = createdSessionId ?? ssoSignIn?.createdSessionId ?? ssoSignUp?.createdSessionId;
      await finalizeSocial(sessionId, setActive);
    } catch (error) {
      if (!isAuthenticationCancellation(error)) {
        Alert.alert("Couldn’t sign in", authenticationErrorMessage(error));
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const fieldError = localError ?? errors.fields.identifier?.message ?? errors.fields.password?.message;
  return (
    <AuthLayout
      onEmail={emailSignIn}
      onApple={() => social("apple")}
      onGoogle={() => social("google")}
      loading={fetchStatus === "fetching" || socialLoading}
      error={fieldError}
    />
  );
}

export default function SignInScreen() {
  if (serviceReadiness.authentication && env.clerkPublishableKey) return <ConfiguredSignIn />;

  const notConfigured = () => Alert.alert("Authentication isn’t configured", "Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local, then restart Expo.");
  return <AuthLayout onEmail={notConfigured} onApple={notConfigured} onGoogle={notConfigured} loading={false} />;
}

