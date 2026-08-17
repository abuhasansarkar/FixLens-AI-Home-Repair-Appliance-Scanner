import { useSignUp, useSSO } from "@clerk/expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { Apple } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/ui/google-icon";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { env, serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { authenticationErrorMessage, isAuthenticationCancellation } from "@/utils/auth-errors";

WebBrowser.maybeCompleteAuthSession();

function ConfiguredSignUp() {
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const submit = async () => {
    if (password !== confirmation) {
      setLocalError("Passwords do not match.");
      return;
    }
    if (!accepted) {
      setLocalError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLocalError(undefined);
    const parts = name.trim().split(/\s+/);
    const firstName = parts.shift();
    const lastName = parts.join(" ") || undefined;
    try {
      const { error } = await signUp.password({
        emailAddress: email.trim(),
        password,
        firstName,
        lastName,
        legalAccepted: accepted,
      });
      if (error) {
        setLocalError(error.message || "Failed to create account.");
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: () => router.replace("/onboarding/scan") });
        return;
      }
      const verification = await signUp.verifications.sendEmailCode();
      if (!verification.error) {
        router.push("/auth/verify-email");
      } else {
        setLocalError(verification.error.message || "Failed to send verification code.");
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
        unsafeMetadata: { legalAccepted: true },
      });
      const sessionId = createdSessionId ?? ssoSignUp?.createdSessionId ?? ssoSignIn?.createdSessionId;
      if (sessionId && setActive) {
        await setActive({ session: sessionId });
        router.replace("/onboarding/scan");
      }
    } catch (error) {
      if (!isAuthenticationCancellation(error)) {
        Alert.alert("Account Not Created", authenticationErrorMessage(error));
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const error = localError ?? errors.fields.emailAddress?.message ?? errors.fields.password?.message;
  const loading = fetchStatus === "fetching" || socialLoading;

  return (
    <AuthFormScreen title="Create your account" body="Save diagnoses, repairs, appliances, and maintenance securely.">
      <View className="gap-3">
        <Button
          label="Continue with Google"
          variant="secondary"
          icon={<GoogleIcon size={20} />}
          loading={socialLoading}
          disabled={loading}
          onPress={() => { void social("google"); }}
        />
        <Button
          label="Continue with Apple"
          variant="secondary"
          icon={<Apple color={colors.ink} size={20} />}
          loading={socialLoading}
          disabled={loading}
          onPress={() => { void social("apple"); }}
        />

        <View className="my-2 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-line dark:bg-dark-line" />
          <AppText variant="caption">or continue with email</AppText>
          <View className="h-px flex-1 bg-line dark:bg-dark-line" />
        </View>

        <TextField placeholder="Full name" autoCapitalize="words" value={name} onChangeText={setName} />
        <TextField kind="email" placeholder="Email address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextField kind="password" placeholder="Password (at least 8 characters)" value={password} onChangeText={setPassword} />
        <TextField kind="password" placeholder="Confirm password" value={confirmation} onChangeText={setConfirmation} />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          className="min-h-12 flex-row items-center gap-3 pt-1"
          onPress={() => setAccepted((value) => !value)}
        >
          <View className={accepted ? "h-6 w-6 items-center justify-center rounded-md bg-brand" : "h-6 w-6 rounded-md border border-line bg-surface dark:border-dark-line dark:bg-dark-surface"}>
            {accepted ? <AppText variant="label" color={colors.white}>✓</AppText> : null}
          </View>
          <AppText variant="caption" className="flex-1">I agree to the Terms of Service and Privacy Policy.</AppText>
        </Pressable>
        <View className="flex-row justify-center gap-4">
          <Pressable className="min-h-9 justify-center" onPress={() => router.push("/legal/terms")}><AppText variant="label" color={colors.brand}>Terms</AppText></Pressable>
          <Pressable className="min-h-9 justify-center" onPress={() => router.push("/legal/privacy")}><AppText variant="label" color={colors.brand}>Privacy</AppText></Pressable>
        </View>

        {error ? <AppText variant="caption" color={colors.danger}>{error}</AppText> : null}
        <Button
          label="Create account"
          loading={loading}
          disabled={!name.trim() || !email || password.length < 8 || password !== confirmation || !accepted || loading}
          onPress={() => { void submit(); }}
        />

        <View className="flex-row items-center justify-center py-4">
          <AppText variant="caption">Already have an account? </AppText>
          <Pressable onPress={() => router.push("/auth/sign-in")}>
            <AppText variant="label" color={colors.brand}>Sign In</AppText>
          </Pressable>
        </View>
      </View>
    </AuthFormScreen>
  );
}

export default function SignUpScreen() {
  if (serviceReadiness.authentication && env.clerkPublishableKey) return <ConfiguredSignUp />;
  return (
    <AuthFormScreen title="Create your account" body="Authentication requires Clerk configuration.">
      <Button label="Configuration required" onPress={() => Alert.alert("Clerk key required", "Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local.")} />
    </AuthFormScreen>
  );
}

