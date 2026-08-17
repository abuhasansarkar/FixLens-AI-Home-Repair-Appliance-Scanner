import * as Notifications from "expo-notifications";
import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export function NotificationRuntime({ children }: PropsWithChildren) {
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS === "android") void Notifications.setNotificationChannelAsync("reminders", { name: "FixLens reminders", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 250, 250, 250] });
  }, []);
  useEffect(() => { const subscription = Notifications.addNotificationResponseReceivedListener((response) => { const data = response.notification.request.content.data; if (data?.type === "maintenance" && typeof data.taskId === "string") router.push({ pathname: "/maintenance/[taskId]", params: { taskId: data.taskId } }); else if (data?.type === "warranty" && typeof data.applianceId === "string") router.push({ pathname: "/appliance/[applianceId]", params: { applianceId: data.applianceId } }); else if (data?.type === "repair_follow_up" && typeof data.repairId === "string") router.push({ pathname: "/repairs/[repairId]", params: { repairId: data.repairId } }); }); return () => subscription.remove(); }, [router]);
  return children;
}
