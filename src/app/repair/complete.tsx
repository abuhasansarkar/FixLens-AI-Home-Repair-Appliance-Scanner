import { useRouter } from "expo-router";
import { Check, LockKeyhole, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";

export default function RepairCompleteScreen() {
  const router = useRouter();
  const { active, finish } = useRepair();
  const [choice, setChoice] = useState<"fixed" | "not_fixed">();
  const [minutes, setMinutes] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const record = async (fixed: boolean) => {
    setBusy(true);
    try {
      await finish(fixed, { notes: notes.trim() || undefined, actualMinutes: minutes ? Number(minutes) : undefined, actualCost: cost ? Number(cost) : undefined });
      if (fixed) router.replace("/repair/success"); else setChoice("not_fixed");
    } catch { Alert.alert("Repair outcome not saved", "Check your connection and try again."); }
    finally { setBusy(false); }
  };

  if (choice === "not_fixed") return <AppScreen><View className="flex-1 items-center justify-center"><View className="h-24 w-24 items-center justify-center rounded-full bg-caution-soft dark:bg-dark-caution-soft"><TriangleAlert color={colors.caution} size={46} /></View><AppText variant="title" align="center" className="mt-7">The issue is not resolved yet</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Stop if conditions changed or became unsafe. Choose a next step without losing your progress.</AppText><View className="mt-9 w-full gap-3"><Button label="Ask FixLens Assistant" onPress={() => router.push("/repair/assistant")} /><Button label="Run a New Diagnosis" variant="secondary" onPress={() => router.push({ pathname: "/scan/camera", params: { newSession: "1" } })} /><Button label="Find Professional Help" variant="ghost" onPress={() => router.push("/support/help")} /><Button label="Return to Repair" variant="ghost" onPress={() => router.replace("/repair/progress")} /></View></View></AppScreen>;

  return <AppScreen><View className="items-center"><View className="h-32 w-32 items-center justify-center rounded-full bg-safe-soft dark:bg-dark-safe-soft"><View className="h-20 w-20 items-center justify-center rounded-full bg-[#D1F3DC]"><Check color={colors.safe} size={50} /></View></View><AppText variant="title" align="center" className="mt-7">Did that fix it?</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Let us know whether {active.appliance} is now working properly.</AppText></View>{choice === "fixed" ? <View className="mt-7 gap-3"><AppText variant="heading">Optional repair details</AppText><TextInput accessibilityLabel="Actual repair time in minutes" keyboardType="number-pad" className="min-h-[54px] rounded-control border border-line bg-surface px-4 text-base text-ink dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink" placeholder="Actual time in minutes" placeholderTextColor={colors.subtle} value={minutes} onChangeText={setMinutes} /><TextInput accessibilityLabel="Actual repair cost" keyboardType="decimal-pad" className="min-h-[54px] rounded-control border border-line bg-surface px-4 text-base text-ink dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink" placeholder="Actual cost (optional)" placeholderTextColor={colors.subtle} value={cost} onChangeText={setCost} /><TextInput accessibilityLabel="Repair notes" multiline maxLength={1000} className="min-h-[112px] rounded-control border border-line bg-surface px-4 py-3 text-base text-ink dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink" placeholder="Notes for your repair history" placeholderTextColor={colors.subtle} value={notes} onChangeText={setNotes} /><Button label="Save as Fixed" loading={busy} onPress={() => { void record(true); }} /><Button label="Back" variant="ghost" onPress={() => setChoice(undefined)} /></View> : <View className="mt-9 gap-3"><Button label="Yes, it’s fixed" onPress={() => setChoice("fixed")} /><Button label="Not yet" variant="secondary" loading={busy} onPress={() => { void record(false); }} /></View>}<View className="mt-10 flex-row gap-3 rounded-card border border-[#BBD3FF] bg-surface p-4 dark:bg-dark-surface"><LockKeyhole color={colors.brand} size={22} /><AppText variant="body" className="flex-1">Your outcome and optional notes are stored privately in repair history.</AppText></View></AppScreen>;
}
