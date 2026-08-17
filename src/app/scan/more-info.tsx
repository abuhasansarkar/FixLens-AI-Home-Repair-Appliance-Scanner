import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, Images, X } from "lucide-react-native";
import { Alert, Pressable, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";

import { safeGoBack } from "@/utils/navigation";

export default function MoreInfoScreen() {
  const router = useRouter();
  const { instructions, purpose = "evidence" } = useLocalSearchParams<{ instructions?: string; purpose?: "problem" | "label" | "evidence" }>();
  const { images, addImage, setClarification } = useScan();
  const choose = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Photo access needed", "Allow photo access in system Settings to choose evidence."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
    if (!result.canceled && result.assets[0]) { await addImage(result.assets[0].uri, purpose); router.replace("/scan/analyzing"); }
  };
  const cannotProvide = () => { setClarification("I cannot safely find or provide the requested photo."); router.replace({ pathname: "/diagnosis/unsupported", params: { reason: "The requested evidence could not be collected safely, so FixLens stopped without making an assessment." } }); };
  return <AppScreen scroll={false}>
    <View className="flex-row items-center justify-between"><BrandMark compact /><Pressable accessibilityLabel="Close" className="h-11 w-11 items-center justify-center" onPress={() => safeGoBack(router, "/tabs/home")}><X color={colors.ink} size={22} /></Pressable></View>
    <AppText variant="title" align="center" className="mt-8">One more photo will help.</AppText>
    {images[0] ? <Image source={{ uri: images[0].uri }} contentFit="cover" style={{ width: "100%", height: 270, borderRadius: 28 }} className="mt-7 h-[270px] w-full rounded-hero" /> : <View className="mt-7 h-[270px] w-full rounded-hero bg-brand-soft dark:bg-dark-brand-soft" />}
    <AppText variant="body" align="center" className="mt-6">{instructions ?? "Take one clear, safely obtainable photo showing the requested detail. Do not approach an active hazard."}</AppText>
    <View className="mt-auto gap-3 pt-8"><Button label="Open Camera" icon={<Camera color={colors.white} size={20} />} onPress={() => router.push({ pathname: "/scan/camera", params: { purpose } })} /><Button label="Choose from Photos" variant="secondary" icon={<Images color={colors.brand} size={20} />} onPress={() => { void choose(); }} /><Button label="I can’t provide it safely" variant="ghost" onPress={cannotProvide} /></View>
  </AppScreen>;
}
