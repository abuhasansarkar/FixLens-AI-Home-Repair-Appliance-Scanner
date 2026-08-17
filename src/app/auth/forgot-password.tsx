import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, View } from "react-native";

import { AuthFormScreen } from "@/components/auth/auth-form-screen";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { env } from "@/config/env";
import { colors } from "@/constants/design";

type Stage = "email" | "code" | "password";

function ConfiguredRecovery() {
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async () => {
    const created = await signIn.create({ identifier: email.trim() });
    if (created.error) { setStage("code"); setCooldown(30); return; }
    const result = await signIn.resetPasswordEmailCode.sendCode();
    if (!result.error) { setStage("code"); setCooldown(30); }
  };

  const verify = async () => {
    const result = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (!result.error) setStage("password");
  };

  const reset = async () => {
    const result = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (!result.error && signIn.status === "complete") {
      // Let the root auth/onboarding guards choose the destination after the
      // new session is active. A returning user must not repeat onboarding.
      await signIn.finalize({ navigate: () => router.replace("/") });
    }
  };

  const fieldError = errors.fields.code?.message ?? errors.fields.password?.message;
  return (
    <AuthFormScreen title="Reset your password" body={stage === "email" ? "Enter your email to request a secure verification code." : stage === "code" ? `If an account exists for ${email}, a code has been sent.` : "Choose a new password for your account."}>
      <View className="gap-3">
        {stage === "email" ? <TextField kind="email" placeholder="Email address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} /> : null}
        {stage === "code" ? <TextField placeholder="Verification code" keyboardType="number-pad" value={code} onChangeText={setCode} /> : null}
        {stage === "password" ? <TextField kind="password" placeholder="New password" value={password} onChangeText={setPassword} /> : null}
        {fieldError ? <AppText variant="caption" color={colors.danger}>{fieldError}</AppText> : null}
        <Button label={stage === "email" ? "Send reset code" : stage === "code" ? "Verify code" : "Set new password"} loading={fetchStatus === "fetching"} disabled={stage === "email" ? !email : stage === "code" ? code.length < 6 : password.length < 8} onPress={stage === "email" ? send : stage === "code" ? verify : reset} />
        {stage === "code" ? <><Button label={cooldown ? `Resend code in ${cooldown}s` : "Resend code"} variant="ghost" disabled={cooldown > 0} onPress={async()=>{const result=await signIn.resetPasswordEmailCode.sendCode();if(!result.error)setCooldown(30);}}/><Button label="Use a different email" variant="ghost" onPress={()=>{setStage("email");setCode("");setCooldown(0);}}/></> : null}
      </View>
    </AuthFormScreen>
  );
}

export default function ForgotPasswordScreen() {
  if (env.clerkPublishableKey) return <ConfiguredRecovery />;
  return <AuthFormScreen title="Reset your password" body="Authentication requires Clerk configuration."><Button label="Configuration required" onPress={() => Alert.alert("Clerk key required", "Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to .env.local.")} /></AuthFormScreen>;
}
