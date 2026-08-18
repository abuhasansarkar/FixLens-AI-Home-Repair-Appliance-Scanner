import { useAction, useMutation } from "convex/react";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScanLine } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { env, serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";
import { blobToArrayBuffer } from "@/utils/blob";

function digestHex(buffer: ArrayBuffer) { return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join(""); }

export default function ApplianceAnalyzingScreen() {
  const { uri, mode = "appliance" } = useLocalSearchParams<{ uri?: string; mode?: string }>();
  const router = useRouter();
  const createSession = useMutation(convexApi.diagnoses.createApplianceScanSession);
  const uploadUrl = useMutation(convexApi.diagnoses.generateUploadUrl);
  const completeUpload = useMutation(convexApi.diagnoses.completeImageUpload);
  const extract = useAction(convexApi.diagnoses.extractAppliance);
  const normalizeImage = useAction(convexApi.diagnoses.normalizeImage);
  const started = useRef(false);
  const [error, setError] = useState<string>();

  const run = async () => {
    if (!uri || !serviceReadiness.authentication || !serviceReadiness.backend) { setError("Appliance extraction requires configured Clerk, Convex, and OpenAI services."); return; }
    setError(undefined);
    try {
      const inspected = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      const resize = Math.max(inspected.width, inspected.height) > env.maxImageLongEdge ? [{ resize: inspected.width >= inspected.height ? { width: env.maxImageLongEdge } : { height: env.maxImageLongEdge } }] : [];
      const optimized = await ImageManipulator.manipulateAsync(inspected.uri, resize, { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG });
      const sessionId = await createSession({ idempotencyKey: Crypto.randomUUID() });
      const blob = await (await fetch(optimized.uri)).blob();
      const bytes = await blobToArrayBuffer(blob);
      const target = await uploadUrl({ sessionId });
      const response = await fetch(target, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!response.ok) throw new Error("Upload failed");
      const uploaded = await response.json() as { storageId?: string };
      if (!uploaded.storageId) throw new Error("Upload did not return storage");
      const imageId = await completeUpload({ sessionId, storageId: uploaded.storageId, purpose: mode === "label" ? "label" : "problem", mime: "image/jpeg", size: bytes.byteLength, width: optimized.width, height: optimized.height, checksum: digestHex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)) });
      await normalizeImage({ imageId });
      const result = await extract({ sessionId });
      router.replace({ pathname: "/appliance/detected", params: { name: result.name, brand: result.brand ?? "", model: result.model ?? "", serial: result.serial ?? "", confidence: String(result.confidence), imageUri: optimized.uri, scanSessionId: sessionId } });
    } catch (cause) { setError(cause instanceof Error && cause.message.includes("limit") ? cause.message : "Details could not be extracted. Try a clearer label photo or enter them manually."); }
  };
  useEffect(() => { if (!started.current) { started.current = true; void run(); } });

  return <AppScreen scroll={false}><View className="flex-1 items-center justify-center"><View className="h-20 w-20 items-center justify-center rounded-full bg-brand-soft dark:bg-dark-brand-soft"><ScanLine color={colors.brand} size={40} /></View><AppText variant="title" align="center" className="mt-6">Reading appliance details</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Visible fields are extracted as suggestions. You must confirm them before saving.</AppText>{uri ? <Image source={{ uri }} contentFit="cover" style={{ width: 176, height: 176, borderRadius: 18 }} className="mt-7 h-44 w-44 rounded-card" /> : null}{error ? <View className="mt-7 w-full gap-3"><AppText variant="body" align="center" color={colors.danger}>{error}</AppText><Button label="Try Again" onPress={() => { void run(); }} /><Button label="Enter Manually" variant="secondary" onPress={() => router.replace("/appliance/detected")} /></View> : null}</View></AppScreen>;
}
