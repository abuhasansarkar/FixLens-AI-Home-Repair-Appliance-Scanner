import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Check, CircleHelp, ShieldCheck, TriangleAlert } from "lucide-react-native";
import { View } from "react-native";

import { RepairSummary } from "@/components/repair/repair-summary";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";
import { convexApi } from "@/services/convex-references";
import type { DiagnosisResult } from "@/types/contracts";

const developmentResult: DiagnosisResult = {
  identifiedItem: { category: "Front-load washer", brand: "Samsung", model: "WF45T6000AW" },
  issue: "Water Supply Issue",
  observations: ["The washer appears connected to two inlet hoses."],
  assumptions: ["The displayed appliance matches the photographed unit."],
  confidence: 0.88,
  safety: { level: "green", summary: "No visible immediate hazard was identified.", stopReasons: [] },
  likelyCauses: [{ label: "Water supply valve partially closed", confidence: 0.82 }, { label: "Kinked or twisted water inlet hose", confidence: 0.71 }, { label: "Sediment in the inlet filter screen", confidence: 0.58 }],
  canContinueUsing: "Avoid running another cycle until water flow is checked.",
  professionalRequired: false,
  difficulty: "easy",
  repairSteps: [
    { title: "Turn off the water supply", instruction: "Close both supply valves behind the washer.", safetyNote: "Do not force a seized valve." },
    { title: "Disconnect power", instruction: "Unplug the washer before moving or inspecting it.", safetyNote: "Keep the plug and outlet dry." },
    { title: "Inspect inlet hoses", instruction: "Check for kinks, crushing, cracks, corrosion, or loose connections.", safetyNote: "Replace damaged hoses; do not patch them." },
  ],
  tools: ["Manufacturer manual", "Flashlight"],
  parts: [],
};

function ResultContent({ result, sessionId }: { result: DiagnosisResult; sessionId?: string }) {
  const router = useRouter();
  const { start } = useRepair();
  const unsafe = result.safety.level === "orange" || result.safety.level === "red" || result.professionalRequired;
  const appliance = [result.identifiedItem.brand, result.identifiedItem.category].filter(Boolean).join(" ") || "Appliance";
  const prepare = async () => {
    await start({ appliance, issue: result.issue, sessionId, difficulty: result.difficulty, estimatedMinutes: result.estimatedMinutes ?? undefined, estimatedCost: result.estimatedCost ?? undefined, tools: result.tools, parts: result.parts, steps: result.repairSteps.map((step) => ({ title: step.title, body: step.instruction, safety: step.safetyNote ?? undefined })) });
  };
  const begin = async () => {
    await prepare();
    router.push("/repair/overview");
  };
  const ask = async () => { await prepare(); router.push("/repair/assistant"); };
  const metrics = [
    { label: "Difficulty", value: result.difficulty[0].toUpperCase() + result.difficulty.slice(1) },
    { label: "Time", value: result.estimatedMinutes ? `${result.estimatedMinutes.minimum}–${result.estimatedMinutes.maximum} min` : "Not estimated" },
    { label: "Est. cost", value: result.estimatedCost ? `${result.estimatedCost.currency} ${result.estimatedCost.minimum}–${result.estimatedCost.maximum}` : "Not estimated" },
  ];

  return <AppScreen footer={<View className="gap-3"><Button label={unsafe ? "Find professional help" : "Start Repair"} variant={unsafe ? "danger" : "primary"} disabled={!unsafe && !result.repairSteps.length} onPress={() => unsafe ? router.push("/support/help") : void begin()} /><Button label={unsafe ? "What should I do now?" : "Ask FixLens"} variant="secondary" onPress={() => unsafe ? router.push("/legal/ai-safety") : void ask()} /></View>}>
    <Header title="AI Diagnosis" />
    <RepairSummary appliance={appliance} model={result.identifiedItem.model ?? undefined} confidence={result.confidence} />
    <Card className={unsafe ? "mt-5 border-danger bg-danger-soft dark:bg-dark-danger-soft" : "mt-5 border-[#B9E4C7] bg-surface dark:bg-dark-surface"}>
      <View className="flex-row items-start gap-3">{unsafe ? <TriangleAlert color={colors.danger} size={27} /> : <View className="h-7 w-7 items-center justify-center rounded-full bg-safe"><Check color={colors.white} size={18} /></View>}<View className="flex-1"><AppText variant="heading">{result.issue}</AppText><View className={unsafe ? "mt-2 self-start rounded-full border border-danger px-3 py-1" : "mt-2 self-start rounded-full bg-safe-soft dark:bg-dark-safe-soft px-3 py-1"}><AppText variant="label" color={unsafe ? colors.danger : colors.safe}>{unsafe ? "Professional Required" : result.safety.level === "yellow" ? "Use Caution" : "Safe DIY"}</AppText></View></View></View>
      <AppText variant="body" className="mt-4">{result.safety.summary}</AppText>
      {result.safety.stopReasons.map((reason) => <View key={reason} className="mt-3 flex-row gap-2"><AlertTriangle color={colors.danger} size={18} /><AppText variant="label" color={colors.danger} className="flex-1">{reason}</AppText></View>)}
      <View className="my-4 h-px bg-line" />
      <AppText variant="label">Likely Causes</AppText>
      <View className="mt-3 gap-3">{result.likelyCauses.map((cause) => <View key={cause.label} className="flex-row items-start gap-3"><CircleHelp color={colors.muted} size={19} /><View className="flex-1"><AppText variant="body">{cause.label}</AppText><AppText variant="caption">{Math.round(cause.confidence * 100)}% confidence</AppText></View></View>)}</View>
    </Card>
    <Card className="mt-4 flex-row p-0">{metrics.map((metric, index) => <View key={metric.label} className={index ? "min-h-[78px] flex-1 items-center justify-center border-l border-line px-2 dark:border-dark-line" : "min-h-[78px] flex-1 items-center justify-center px-2"}><AppText variant="caption" align="center">{metric.label}</AppText><AppText variant="label" align="center" color={!unsafe && index !== 1 ? colors.safe : colors.ink} className="mt-1">{metric.value}</AppText></View>)}</Card>
    <Card className="mt-4"><AppText variant="label">Can I keep using it?</AppText><AppText variant="body" className="mt-1">{result.canContinueUsing}</AppText></Card>
    <Card className="mt-4"><AppText variant="label">Visible observations</AppText>{result.observations.length ? result.observations.map((item) => <AppText key={item} variant="body" className="mt-2">• {item}</AppText>) : <AppText variant="body" color={colors.muted} className="mt-2">No reliable visual observation was recorded.</AppText>}<View className="my-4 h-px bg-line dark:bg-dark-line" /><AppText variant="label">Assumptions to verify</AppText>{result.assumptions.length ? result.assumptions.map((item) => <AppText key={item} variant="body" color={colors.caution} className="mt-2">• {item}</AppText>) : <AppText variant="body" color={colors.muted} className="mt-2">No additional assumptions were recorded.</AppText>}</Card>
    {unsafe ? <View className="mt-5 flex-row items-center justify-center gap-2"><ShieldCheck color={colors.muted} size={18} /><AppText variant="caption">Repair steps are withheld for orange and red hazards.</AppText></View> : null}
    <AppText variant="caption" align="center" color={colors.caution} className="mt-4">AI assessments can be wrong. Stop if conditions differ or feel unsafe.</AppText>
  </AppScreen>;
}

function ConnectedResult() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const result = useQuery(convexApi.diagnoses.getResult, sessionId ? { sessionId } : "skip");
  if (result === undefined) return <AppScreen><Header title="AI Diagnosis" /><AppText variant="body" align="center" className="mt-12">Loading your private assessment…</AppText></AppScreen>;
  if (!result) return <AppScreen><Header title="AI Diagnosis" /><AppText variant="heading" align="center" className="mt-12">Assessment unavailable</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Return to Scan and try again. An incomplete assessment does not consume usage.</AppText></AppScreen>;
  return <ResultContent result={result} sessionId={sessionId} />;
}

export default function DiagnosisResultScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <ConnectedResult />;
  if (__DEV__) return <ResultContent result={developmentResult} />;
  return <AppScreen><Header title="AI Diagnosis" /><AppText variant="heading" align="center" className="mt-12">Diagnosis service unavailable</AppText></AppScreen>;
}
