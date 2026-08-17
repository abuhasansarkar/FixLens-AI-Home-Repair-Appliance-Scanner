import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ImageIcon, RotateCcw, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

import { safeGoBack } from "@/utils/navigation";

export default function ApplianceScannerScreen() {
  const router = useRouter();
  const { mode = "appliance" } = useLocalSearchParams<{ mode?: "appliance" | "label" }>();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uri, setUri] = useState<string>();
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  const choose = async () => {
    const access = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!access.granted) return Alert.alert("Photo access needed", "Allow photo access in Settings, then try again.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (!result.canceled) setUri(result.assets[0]?.uri);
  };
  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try { const photo = await camera.current.takePictureAsync({ quality: 0.9 }); setUri(photo?.uri); }
    catch { Alert.alert("Photo not captured", "Check the camera and try again."); }
    finally { setBusy(false); }
  };
  const analyze = () => uri && router.replace({ pathname: "/appliance/analyzing", params: { uri, mode } });

  if (!permission) return <View className="flex-1 bg-camera" />;
  if (!permission.granted) return <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-8 dark:bg-dark-canvas"><ImageIcon color={colors.brand} size={42} /><AppText variant="title" align="center" className="mt-5">Camera access</AppText><AppText variant="body" align="center" color={colors.muted} className="mb-7 mt-2">Take a private appliance or label photo. It is removed after extraction.</AppText><View className="w-full gap-3"><Button label="Allow Camera" onPress={requestPermission} /><Button label="Choose from Gallery" variant="secondary" onPress={() => { void choose(); }} /><Button label="Not Now" variant="ghost" onPress={() => safeGoBack(router, "/tabs/my-home")} /></View></SafeAreaView>;

  return <View className="flex-1 bg-camera">
    {uri ? <Image source={{ uri }} contentFit="cover" className="absolute inset-0" /> : focused ? <CameraView ref={camera} className="absolute inset-0" facing="back" /> : null}
    <SafeAreaView className="flex-1 justify-between" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pt-2"><Pressable accessibilityLabel="Close scanner" className="h-11 w-11 items-center justify-center rounded-full bg-black/50" onPress={() => safeGoBack(router, "/tabs/my-home")}><X color={colors.white} size={24} /></Pressable><View className="rounded-full bg-black/50 px-4 py-2"><AppText variant="label" color={colors.white}>{mode === "label" ? "Scan model label" : "Scan appliance"}</AppText></View><View className="w-11" /></View>
      <View className="mx-8 aspect-[4/5] rounded-[28px] border-2 border-white/90" />
      <View className="items-center bg-black/45 px-6 pb-5 pt-4"><AppText variant="body" align="center" color={colors.white}>{mode === "label" ? "Keep model and serial text sharp and readable" : "Fit the whole appliance inside the frame"}</AppText>{uri ? <View className="mt-4 w-full gap-3"><Button label="Extract Details" loading={busy} onPress={analyze} /><Button label="Retake" variant="secondary" icon={<RotateCcw color={colors.brand} size={18} />} onPress={() => setUri(undefined)} /></View> : <View className="mt-5 w-full flex-row items-center justify-between px-5"><Pressable accessibilityLabel="Choose from gallery" className="h-12 w-12 items-center justify-center rounded-xl bg-white/20" onPress={() => { void choose(); }}><ImageIcon color={colors.white} size={23} /></Pressable><Pressable accessibilityLabel="Take appliance photo" disabled={busy} className="h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white bg-white/30" onPress={() => { void capture(); }}><View className="h-[60px] w-[60px] rounded-full bg-surface" /></Pressable><View className="h-12 w-12" /></View>}</View>
    </SafeAreaView>
  </View>;
}
