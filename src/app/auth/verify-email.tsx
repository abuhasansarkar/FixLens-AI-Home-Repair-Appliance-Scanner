import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { env } from "@/config/env";
import { colors } from "@/constants/design";

function ConfiguredVerification() {
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const verify = async () => {
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (!error && signUp.status === "complete") {
      await signUp.finalize({ navigate: () => router.replace("/onboarding/scan") });
    }
  };

  return (
    <AuthFormScreen title="Verify your email" body={`Enter the verification code sent to ${signUp.emailAddress ?? "your email"}.`}>
      <View className="gap-3">
        <TextField placeholder="Verification code" keyboardType="number-pad" autoCapitalize="none" value={code} onChangeText={setCode} />
        {errors.fields.code?.message ? <AppText variant="caption" color={colors.danger}>{errors.fields.code.message}</AppText> : null}
        <Button label="Verify email" loading={fetchStatus === "fetching"} disabled={code.trim().length < 6} onPress={verify} />
        <Button label={cooldown ? `Send a new code in ${cooldown}s` : "Send a new code"} variant="ghost" disabled={cooldown > 0} onPress={async () => { const result = await signUp.verifications.sendEmailCode(); if (!result.error) setCooldown(30); }} />
        <Button label="Change email" variant="ghost" onPress={() => router.replace("/auth/sign-up")} />
      </View>
    </AuthFormScreen>
  );
}

export default function VerifyEmailScreen() {
  if (env.clerkPublishableKey) return <ConfiguredVerification />;
  return <AuthFormScreen title="Verify your email" body="Clerk is not configured."><Button label="Go back" onPress={() => Alert.alert("Clerk key required")} /></AuthFormScreen>;
}
