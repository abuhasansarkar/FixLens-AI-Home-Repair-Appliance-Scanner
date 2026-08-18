import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { BrandMark } from "@/components/brand-mark";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";

export default function ReviewPhotoScreen() {
  const router = useRouter();
  const { uri, purpose = "problem" } = useLocalSearchParams<{ uri?: string; purpose?: "problem" | "label" | "evidence" }>();
  const { images, description, setDescription, addImage, reset } = useScan();
  const [saving, setSaving] = useState(false);

  const usePhoto = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      if (purpose === "problem" && images.length >= 3) {
        reset();
      }
      await addImage(uri, purpose);
      router.push("/scan/analyzing");
    } catch (error) {
      Alert.alert("Photo not ready", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addAnother = async () => {
    if (!uri) return;
    setSaving(true);
    try {
      if (purpose === "problem" && images.length >= 3) {
        reset();
      }
      await addImage(uri, purpose);
      router.replace({ pathname: "/scan/camera", params: { purpose: "evidence" } });
    } catch (error) {
      Alert.alert("Photo not ready", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!uri) return <AppScreen scroll={false}><Header title="Review photo" /><View className="flex-1 items-center justify-center"><AppText variant="heading">No photo to review</AppText></View><Button label="Open camera" onPress={() => router.replace("/scan/camera")} /></AppScreen>;

  return (
    <AppScreen>
      <Header center={<BrandMark compact />} />
      <AppText variant="title" align="center" className="mt-5">Does this photo clearly show the problem?</AppText>
      <Image source={{ uri }} contentFit="cover" style={{ width: "100%", height: 300, borderRadius: 28 }} className="mt-5 h-[300px] w-full rounded-hero bg-line" />
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1"><Button label="Use Photo" loading={saving} onPress={usePhoto} /></View>
        <View className="flex-1"><Button label="Retake" variant="secondary" icon={<RotateCcw color={colors.brand} size={18} />} onPress={() => router.replace({ pathname: "/scan/camera", params: { purpose } })} /></View>
      </View>
      <View className="mt-3"><Button label={`Add another photo (${Math.min(images.length + 1, 3)}/3)`} disabled={images.length >= 2 || saving} variant="secondary" icon={<Plus color={colors.brand} size={19} />} onPress={() => { void addAnother(); }} /></View>
      <AppText variant="heading" className="mt-7">What’s happening?</AppText>
      <View className="mt-3 min-h-[118px] rounded-control border border-line dark:border-dark-line bg-surface dark:bg-dark-surface px-4 py-3">
        <TextInput multiline maxLength={300} placeholder="Example: My washer stops mid-cycle and shows a 4C error." placeholderTextColor={colors.subtle} className="min-h-[72px] text-base text-ink dark:text-dark-ink" value={description} onChangeText={setDescription} />
        <AppText variant="caption" align="right">{description.length}/300</AppText>
      </View>
    </AppScreen>
  );
}
