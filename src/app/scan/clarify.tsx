import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";

export default function ClarifyScreen() {
  const router = useRouter(); const { question } = useLocalSearchParams<{ question?: string }>(); const scan = useScan(); const [answer, setAnswer] = useState(scan.clarification ?? "");
  const submit = () => { scan.setClarification(answer.trim()); router.replace("/scan/analyzing"); };
  return <AppScreen footer={<View className="gap-3"><Button label="Continue Analysis" disabled={answer.trim().length < 2} onPress={submit} /><Button label="I can’t answer safely" variant="ghost" onPress={() => router.replace({ pathname: "/diagnosis/unsupported", params: { reason: "The clarification could not be answered safely, so FixLens stopped without making an assessment." } })} /></View>}>
    <Header title="AI Question" />
    <AppText variant="title" align="center" className="mt-7">{question ?? "What else should FixLens know?"}</AppText>
    <AppText variant="body" align="center" color={colors.muted} className="mt-2">Answer only if it is safe to observe. Never operate or approach a hazard to collect information.</AppText>
    <View className="mt-7 min-h-[190px] rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface"><TextInput accessibilityLabel="Clarification answer" multiline autoFocus maxLength={500} className="min-h-[135px] text-base text-ink dark:text-dark-ink" placeholder="Describe what you observe…" placeholderTextColor={colors.subtle} value={answer} onChangeText={setAnswer} /><AppText variant="caption" align="right">{answer.length}/500</AppText></View>
  </AppScreen>;
}
