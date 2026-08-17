import { useReverification, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { TriangleAlert } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";

function ConnectedDeletion() {
  const router = useRouter();
  const { user } = useUser();
  const startDeletion = useMutation(convexApi.deletion.start);
  const retryDeletion = useMutation(convexApi.deletion.retry);
  const deleteIdentity = useReverification(async () => user?.delete());
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const existingJob = useQuery(convexApi.deletion.current, {});
  const effectiveJobId=jobId??existingJob?.jobId;
  const job = useQuery(convexApi.deletion.status, effectiveJobId ? { jobId:effectiveJobId } : "skip");
  const finalizing = useRef(false);
  const reportedFailure = useRef(false);

  useEffect(() => {
    if (job?.state === "complete" && !finalizing.current) {
      finalizing.current = true;
      void deleteIdentity().then(() => router.replace("/welcome")).catch(() => { finalizing.current = false; setBusy(false); Alert.alert("Reauthentication required", "Your FixLens data is deleted. Verify your identity to remove the remaining Clerk sign-in account."); });
    }
    if (job?.state === "failed" && effectiveJobId && !reportedFailure.current) { reportedFailure.current = true; const timer = setTimeout(() => { setBusy(false); Alert.alert("Deletion paused", job.error ?? "Retry to resume from the last completed batch.", [{ text: "Cancel", style: "cancel" }, { text: "Retry", onPress: () => { reportedFailure.current = false; setBusy(true); void retryDeletion({ jobId: effectiveJobId }); } }]); }, 0); return () => clearTimeout(timer); }
  }, [deleteIdentity, effectiveJobId, job, retryDeletion, router]);

  const remove = async () => {
    if (confirmation !== "DELETE" || !user) return;
    setBusy(true);
    try {
      setJobId(await startDeletion({}));
    } catch {
      Alert.alert("Deletion could not start", "Check your connection and try again. No additional data was removed by this attempt."); setBusy(false);
    }
  };

  return <DeletionContent confirmation={confirmation} setConfirmation={setConfirmation} busy={busy} progress={job ? `${job.deletedRows} records removed` : undefined} onDelete={remove} />;
}

function DeletionContent({ confirmation, setConfirmation, busy, progress, onDelete }: { confirmation: string; setConfirmation: (value: string) => void; busy: boolean; progress?: string; onDelete: () => void }) {
  return <AppScreen footer={<Button label="Delete FixLens Account" variant="danger" disabled={confirmation !== "DELETE"} loading={busy} onPress={onDelete} />}>
    <Header title="Delete Account" />
    <View className="mt-6 flex-row gap-3 rounded-card border border-danger bg-danger-soft dark:bg-dark-danger-soft p-4"><TriangleAlert color={colors.danger} size={24} /><View className="flex-1"><AppText variant="heading" color={colors.danger}>This cannot be undone</AppText><AppText variant="body" className="mt-1">Your homes, appliances, diagnoses, private images, repair history, reminders, and FixLens profile will be permanently removed.</AppText></View></View>
    <AppText variant="heading" className="mt-6">Your store subscription is separate</AppText>
    <AppText variant="body" color={colors.muted} className="mt-2">Deleting FixLens does not cancel an App Store or Google Play subscription. Cancel it in your store subscription settings first if you do not want it to renew.</AppText>
    <AppText variant="label" className="mt-7">Type DELETE to confirm</AppText>
    <TextInput autoCapitalize="characters" autoCorrect={false} className="mt-2 min-h-[54px] rounded-control border border-line dark:border-dark-line bg-surface dark:bg-dark-surface px-4 text-base text-ink" placeholder="DELETE" placeholderTextColor={colors.subtle} value={confirmation} onChangeText={setConfirmation} />
    {progress ? <AppText accessibilityLiveRegion="polite" variant="caption" align="center" className="mt-3">{progress}</AppText> : null}
  </AppScreen>;
}

export default function DeleteAccountScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <ConnectedDeletion />;
  return <DeletionContent confirmation="" setConfirmation={() => {}} busy={false} onDelete={() => Alert.alert("Services required", "Configure Clerk and Convex before testing account deletion.")} />;
}
