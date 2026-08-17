import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarCheck, Check, Clock3 } from "lucide-react-native";
import { useState } from "react";
import { Alert, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/ui/header";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";

import { safeGoBack } from "@/utils/navigation";

export default function MaintenanceDetailScreen() {
  const router = useRouter(); const { taskId } = useLocalSearchParams<{ taskId: string }>(); const { tasks, appliances, completeTask, rescheduleTask } = useHome(); const [busy, setBusy] = useState(false); const [customDate, setCustomDate] = useState(""); const [openedAt] = useState(Date.now); const task = tasks.find((item) => item.id === taskId);
  if (!task) return <AppScreen><Header fallbackHref="/maintenance" /><AppText variant="heading">Task not found</AppText></AppScreen>;
  const appliance = appliances.find((item) => item.id === task.applianceId); const steps = task.instructions ?? ["Read the model-specific manufacturer maintenance instructions.", "Inspect only accessible exterior components.", "Stop and seek qualified help if you find damage or a hazard."];
  const complete = async () => { setBusy(true); try { await completeTask(task.id); safeGoBack(router, "/maintenance"); } catch { Alert.alert("Couldn’t complete task", "Check your plan and connection, then try again."); } finally { setBusy(false); } };
  const reschedule = async (days: number) => { setBusy(true); try { await rescheduleTask(task.id, openedAt + days * 86_400_000); safeGoBack(router, "/maintenance"); } catch { Alert.alert("Task not rescheduled", "Check your plan and connection, then try again."); } finally { setBusy(false); } };
  const rescheduleCustom = async () => { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customDate.trim()); if (!match) { Alert.alert("Invalid date", "Enter a date as YYYY-MM-DD."); return; } const dueAt = new Date(Number(match[1]), Number(match[2])-1, Number(match[3]), 12).getTime(); if (!Number.isFinite(dueAt) || new Date(dueAt).getDate() !== Number(match[3])) { Alert.alert("Invalid date", "Enter a valid calendar date."); return; } setBusy(true); try { await rescheduleTask(task.id, dueAt); safeGoBack(router, "/maintenance"); } catch { Alert.alert("Task not rescheduled", "Choose a future date within five years and try again."); } finally { setBusy(false); } };
  return <AppScreen footer={<Button label="Mark Complete" loading={busy} icon={<Check color={colors.white} size={20} />} onPress={() => { void complete(); }} />}><Header title="Maintenance Detail" fallbackHref="/maintenance" /><View className="mt-5 items-center"><View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-soft dark:bg-dark-brand-soft"><CalendarCheck color={colors.brand} size={48} /></View><AppText variant="title" align="center" className="mt-5">{task.title}</AppText><AppText variant="body" color={colors.muted} className="mt-1">{appliance?.brand} {appliance?.name}</AppText></View><Card className="mt-7"><View className="flex-row gap-3"><Clock3 color={colors.brand} size={22} /><View className="flex-1"><AppText variant="label">Why this matters</AppText><AppText variant="body" color={colors.muted} className="mt-1">Routine model-specific maintenance can reveal wear before it becomes a larger problem.</AppText><AppText variant="caption" className="mt-2">Due {new Date(task.dueAt).toLocaleDateString()}</AppText></View></View></Card><View className="mt-4 flex-row gap-3"><View className="flex-1"><Button label="Snooze 7 days" variant="secondary" loading={busy} onPress={() => { void reschedule(7); }} /></View><View className="flex-1"><Button label="Move 30 days" variant="secondary" loading={busy} onPress={() => { void reschedule(30); }} /></View></View><View className="mt-3 gap-2"><TextField accessibilityLabel="Custom maintenance date" placeholder="Custom date (YYYY-MM-DD)" keyboardType="numbers-and-punctuation" value={customDate} onChangeText={setCustomDate}/><Button label="Use custom date" variant="secondary" loading={busy} disabled={!customDate.trim()} onPress={()=>{void rescheduleCustom();}}/></View><AppText variant="heading" className="mt-7">Steps</AppText><View className="mt-3 gap-4">{steps.map((item, index) => <View key={item} className="flex-row gap-3"><View className="h-7 w-7 items-center justify-center rounded-full bg-brand"><AppText variant="caption" color={colors.white}>{index + 1}</AppText></View><AppText variant="body" className="flex-1">{item}</AppText></View>)}</View></AppScreen>;
}
