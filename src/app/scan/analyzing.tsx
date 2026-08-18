import { useAction, useMutation } from "convex/react";
import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Check, Circle, RotateCcw, Sparkles, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";
import { convexApi } from "@/services/convex-references";
import { blobToArrayBuffer } from "@/utils/blob";
import { safeGoBack } from "@/utils/navigation";

const stages = ["Preparing private photos", "Reading visible information", "Checking likely causes", "Evaluating safety", "Preparing repair guide"];

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function AnalysisVisual({ stage, error, retry }: { stage: number; error?: string; retry?: () => void }) {
  const router = useRouter();
  const { images } = useScan();
  return <AppScreen scroll={false}>
    <View className="flex-row items-center justify-between"><Pressable accessibilityLabel="Cancel analysis" className="h-11 w-11 items-center justify-center" onPress={() => safeGoBack(router, "/tabs/home")}><X color={colors.ink} size={23} /></Pressable><View className="flex-row items-center gap-2"><Sparkles color={colors.brand} size={19} /><AppText variant="label" color={colors.brand}>AI Analysis</AppText></View><View className="w-11" /></View>
    <AppText variant="title" align="center" className="mt-8">{error ? "Analysis paused" : "Looking for the problem…"}</AppText>
    {images[0] ? <View className="mx-7 mt-7 overflow-hidden rounded-hero border-2 border-[#BBD3FF] bg-brand-soft dark:bg-dark-brand-soft p-2"><Image source={{ uri: images[0].uri }} contentFit="cover" style={{ width: "100%", height: 260, borderRadius: 18 }} className="aspect-square w-full rounded-card" /></View> : null}
    <View className="mt-7 overflow-hidden rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface">{stages.map((label, index) => <View key={label} className={index ? "min-h-[62px] flex-row items-center gap-3 border-t border-line dark:border-dark-line px-4" : "min-h-[62px] flex-row items-center gap-3 px-4"}>{index < stage ? <View className="h-6 w-6 items-center justify-center rounded-full bg-brand"><Check color={colors.white} size={15} /></View> : <Circle color={index === stage ? colors.brand : colors.line} fill={index === stage ? colors.brandSoft : colors.white} size={24} />}<AppText variant="label" className="flex-1">{label}</AppText></View>)}</View>
    {error ? <View className="mt-5 gap-3"><AppText variant="body" align="center" color={colors.danger}>{error}</AppText>{retry ? <Button label="Try Again" icon={<RotateCcw color={colors.white} size={18} />} onPress={retry} /> : null}</View> : null}
  </AppScreen>;
}

function ConnectedAnalysis() {
  const router = useRouter();
  const scan = useScan();
  const createSession = useMutation(convexApi.diagnoses.createSession);
  const generateUploadUrl = useMutation(convexApi.diagnoses.generateUploadUrl);
  const completeUpload = useMutation(convexApi.diagnoses.completeImageUpload);
  const analyze = useAction(convexApi.diagnoses.analyze);
  const normalizeImage = useAction(convexApi.diagnoses.normalizeImage);
  const started = useRef(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string>();

  const run = useCallback(async () => {
    if (!scan.images.length) { router.replace("/scan/camera"); return; }
    setError(undefined);
    try {
      const sessionId = scan.sessionId ?? await createSession({ description: scan.description.trim() || undefined, idempotencyKey: Crypto.randomUUID() });
      if (!scan.sessionId) scan.setSession(sessionId);
      setStage(1);
      for (const image of scan.images.slice(scan.uploadedImageCount)) {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const bytes = await blobToArrayBuffer(blob);
        const checksum = hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
        const uploadUrl = await generateUploadUrl({ sessionId });
        const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": image.mime }, body: blob });
        if (!uploadResponse.ok) throw new Error("A photo could not be uploaded");
        const uploaded = await uploadResponse.json() as { storageId?: string };
        if (!uploaded.storageId) throw new Error("The upload did not return a storage id");
        const imageId = await completeUpload({ sessionId, storageId: uploaded.storageId, purpose: image.purpose, mime: image.mime, size: bytes.byteLength, width: image.width, height: image.height, checksum });
        await normalizeImage({ imageId });
        scan.markUploaded();
      }
      setStage(2);
      const assessmentPromise = analyze({ sessionId, idempotencyKey: Crypto.randomUUID(), clarification: scan.clarification?.trim() || undefined });
      const stageTimer1 = setTimeout(() => setStage(3), 1200);
      const stageTimer2 = setTimeout(() => setStage(4), 2500);
      const assessment = await assessmentPromise;
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setStage(5);
      if (assessment.outcome === "needs_evidence" && assessment.evidenceRequest) router.replace({ pathname: "/scan/more-info", params: { instructions: assessment.evidenceRequest.instructions, purpose: assessment.evidenceRequest.purpose } });
      else if (assessment.outcome === "needs_clarification") router.replace({ pathname: "/scan/clarify", params: { question: assessment.question ?? "What happens when you try to use it?" } });
      else if (assessment.outcome === "unsupported") {
        scan.reset();
        router.replace({ pathname: "/diagnosis/unsupported", params: { reason: assessment.reason ?? "FixLens could not produce a reliable assessment." } });
      } else {
        scan.reset();
        router.replace({ pathname: "/diagnosis/result", params: { sessionId, safetyLevel: assessment.safetyLevel } });
      }
    } catch (cause) {
      console.warn("Diagnosis analysis failed:", cause);
      if (cause instanceof Error && cause.message.toLowerCase().includes("allowance")) { router.replace("/subscription/limit"); return; }
      setError("We couldn’t complete this diagnosis. Your allowance was not consumed; check your connection and try again.");
    }
  }, [analyze, completeUpload, createSession, generateUploadUrl, normalizeImage, router, scan]);

  useEffect(() => { if (!started.current) { started.current = true; void run(); } }, [run]);
  return <AnalysisVisual stage={stage} error={error} retry={() => { started.current = true; void run(); }} />;
}

function DevelopmentAnalysis() {
  const router = useRouter();
  const { images } = useScan();
  const [stage, setStage] = useState(0);
  useEffect(() => { if (!images.length) { router.replace("/scan/camera"); return; } const timer = setInterval(() => setStage((value) => Math.min(4, value + 1)), 700); const finish = setTimeout(() => router.replace({ pathname: "/diagnosis/result", params: { variant: "safe" } }), 3600); return () => { clearInterval(timer); clearTimeout(finish); }; }, [images.length, router]);
  return <><AnalysisVisual stage={stage} /><AppText variant="caption" align="center" color={colors.caution}>Development reference only—no AI request was made.</AppText></>;
}

export default function AnalyzingScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <ConnectedAnalysis />;
  if (__DEV__) return <DevelopmentAnalysis />;
  Alert.alert("Service unavailable", "FixLens diagnosis is not configured in this build.");
  return <AnalysisVisual stage={0} error="Diagnosis service is unavailable." />;
}
