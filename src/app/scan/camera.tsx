import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Image as ImageIcon, X, Zap, ZapOff } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";
import { safeGoBack } from "@/utils/navigation";

export default function CameraScreen() {
  const router = useRouter();
  const { purpose = "problem", newSession } = useLocalSearchParams<{ purpose?: "problem" | "label" | "evidence"; newSession?: string }>();
  const { reset } = useScan();
  const resetHandled = useRef(false);
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [capturing, setCapturing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if ((newSession === "1" || purpose === "problem") && !resetHandled.current) {
      resetHandled.current = true;
      reset();
    }
  }, [newSession, purpose, reset]);

  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, []));

  const review = (uri: string) =>
    router.push({ pathname: "/scan/review", params: { uri, purpose } });

  const choosePhoto = async () => {
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!library.granted) {
      Alert.alert("Photo access needed", "Allow photo access in Settings to choose an existing image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) review(result.assets[0].uri);
  };

  const takePhoto = async () => {
    if (!camera.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) review(photo.uri);
    } catch {
      Alert.alert("Photo not captured", "Check the camera and try again.");
    } finally {
      setCapturing(false);
    }
  };

  if (!permission) return <View className="flex-1 bg-camera" />;

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-8">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-soft dark:bg-dark-brand-soft">
          <ImageIcon color={colors.brand} size={36} />
        </View>
        <AppText variant="title" align="center" className="mt-6">Camera access</AppText>
        <AppText variant="body" align="center" color={colors.muted} className="mb-7 mt-2.5">
          FixLens uses your camera only when you choose to photograph a problem.
        </AppText>
        <View className="w-full gap-3">
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Choose from gallery" variant="secondary" onPress={choosePhoto} />
          <Button label="Not now" variant="ghost" onPress={() => safeGoBack(router, "/tabs/home")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-camera">
      {isFocused ? <CameraView ref={camera} className="absolute inset-0" facing="back" flash={flash} /> : null}
      <SafeAreaView className="flex-1 justify-between" edges={["top", "bottom"]}>
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable accessibilityLabel="Close camera" className="h-11 w-11 items-center justify-center rounded-full bg-black/45" onPress={() => safeGoBack(router, "/tabs/home")}>
            <X color={colors.white} size={25} />
          </Pressable>
          <View className="rounded-full bg-black/45 px-4 py-2"><AppText variant="label" color={colors.white}>Scan a problem</AppText></View>
          <Pressable accessibilityLabel={`Turn flash ${flash === "on" ? "off" : "on"}`} className="h-11 w-11 items-center justify-center rounded-full bg-black/45" onPress={() => setFlash((value) => value === "on" ? "off" : "on")}>
            {flash === "on" ? <Zap color={colors.white} size={22} /> : <ZapOff color={colors.white} size={22} />}
          </Pressable>
        </View>

        <View className="mx-8 aspect-[4/5] rounded-[28px] border-2 border-white/80">
          <View className="absolute -left-0.5 -top-0.5 h-14 w-14 rounded-tl-[28px] border-l-4 border-t-4 border-brand" />
          <View className="absolute -right-0.5 -top-0.5 h-14 w-14 rounded-tr-[28px] border-r-4 border-t-4 border-brand" />
          <View className="absolute -bottom-0.5 -left-0.5 h-14 w-14 rounded-bl-[28px] border-b-4 border-l-4 border-brand" />
          <View className="absolute -bottom-0.5 -right-0.5 h-14 w-14 rounded-br-[28px] border-b-4 border-r-4 border-brand" />
        </View>

        <View className="items-center bg-black/35 px-8 pb-5 pt-5">
          <AppText variant="body" align="center" color={colors.white}>Fit the whole problem inside the frame</AppText>
          <View className="mt-5 w-full flex-row items-center justify-between px-3">
            <Pressable accessibilityLabel="Choose from gallery" className="h-12 w-12 items-center justify-center rounded-xl bg-white/20" onPress={choosePhoto}>
              <ImageIcon color={colors.white} size={23} />
            </Pressable>
            <Pressable accessibilityLabel="Take photo" disabled={capturing} className="h-[78px] w-[78px] items-center justify-center rounded-full border-4 border-white bg-white/30" onPress={takePhoto}>
              <View className="h-[60px] w-[60px] rounded-full bg-surface dark:bg-dark-surface" />
            </Pressable>
            <View className="h-12 w-12" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
