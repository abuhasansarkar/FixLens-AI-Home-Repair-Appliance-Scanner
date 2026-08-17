import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleHelp, ShieldCheck } from "lucide-react-native";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";

export default function UnsupportedDiagnosisScreen() {
  const router = useRouter(); const { reason } = useLocalSearchParams<{ reason?: string }>(); const { reset } = useScan();
  return <AppScreen footer={<View className="gap-3"><Button label="Try a Different Problem" onPress={() => { reset(); router.replace("/scan/camera"); }} /><Button label="Safety & Support" variant="secondary" onPress={() => router.push("/support/help")} /></View>}><Header title="Assessment" /><View className="mt-10 items-center"><View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-soft dark:bg-dark-brand-soft"><CircleHelp color={colors.brand} size={48} /></View><AppText variant="title" align="center" className="mt-6">FixLens can’t assess this reliably</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-3">{reason ?? "The object, category, or available evidence is outside the supported assessment scope."}</AppText></View><Card className="mt-8 flex-row gap-3"><ShieldCheck color={colors.safe} size={22} /><AppText variant="body" className="flex-1">Your diagnosis allowance was not consumed. Do not keep collecting evidence if doing so could be unsafe.</AppText></Card></AppScreen>;
}
