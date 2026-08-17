import { useRouter } from "expo-router";
import { Camera, ChevronRight, PenLine, ScanBarcode } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";

export default function AddApplianceScreen() {
  const router = useRouter();
  const { hydrated, canAddAppliance } = useHome();
  if (hydrated && !canAddAppliance) return <AppScreen footer={<Button label="View FixLens Pro" onPress={()=>router.replace("/subscription/paywall")}/>}><Header title="Add appliance"/><AppText variant="heading" align="center" className="mt-12">Your Free appliance is already saved</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">FixLens Pro includes unlimited appliance profiles and maintenance reminders.</AppText></AppScreen>;
  const options = [
    { title: "Scan Appliance", body: "Use your camera to identify your appliance.", icon: Camera, onPress: () => router.push({ pathname: "/appliance/scanner", params: { mode: "appliance" } }) },
    { title: "Scan Model Label", body: "Scan the model label for the most accurate details.", icon: ScanBarcode, onPress: () => router.push({ pathname: "/appliance/scanner", params: { mode: "label" } }) },
    { title: "Add Manually", body: "Enter appliance details manually.", icon: PenLine, onPress: () => router.push("/appliance/detected") },
  ];
  return <AppScreen>
    <Header center={<BrandMark compact />} />
    <AppText variant="title" align="center" className="mt-6">Add an appliance</AppText>
    <AppText variant="body" align="center" color={colors.muted} className="mt-2">Choose how you’d like to add your appliance.</AppText>
    <View className="mt-8 gap-4">{options.map(({ title, body, icon: Icon, onPress }) => <Pressable accessibilityRole="button" key={title} className="min-h-[118px] flex-row items-center gap-4 rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface" onPress={onPress}><View className="h-16 w-16 items-center justify-center rounded-control bg-brand-soft dark:bg-dark-brand-soft"><Icon color={colors.brand} size={32} /></View><View className="flex-1"><AppText variant="heading">{title}</AppText><AppText variant="body" color={colors.muted} className="mt-1">{body}</AppText></View><ChevronRight color={colors.muted} size={20} /></Pressable>)}</View>
  </AppScreen>;
}
