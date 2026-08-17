import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";

import { safeGoBack } from "@/utils/navigation";

function dateValue(timestamp?: number) { return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : ""; }
function parseDate(value: string) { const time = value ? Date.parse(`${value}T00:00:00Z`) : undefined; return time !== undefined && Number.isFinite(time) ? time : undefined; }

export default function EditApplianceScreen() {
  const router = useRouter();
  const { applianceId } = useLocalSearchParams<{ applianceId: string }>();
  const { appliances, updateAppliance, removeAppliance } = useHome();
  const appliance = appliances.find((item) => item.id === applianceId);
  const [name, setName] = useState(appliance?.name ?? ""); const [brand, setBrand] = useState(appliance?.brand ?? ""); const [model, setModel] = useState(appliance?.model ?? ""); const [serial, setSerial] = useState(appliance?.serial ?? ""); const [room, setRoom] = useState(appliance?.room ?? ""); const [purchaseDate, setPurchaseDate] = useState(dateValue(appliance?.purchaseDate)); const [warrantyEndsAt, setWarrantyEndsAt] = useState(dateValue(appliance?.warrantyEndsAt)); const [notes, setNotes] = useState(appliance?.notes ?? ""); const [busy, setBusy] = useState(false);
  if (!appliance) return <AppScreen><Header fallbackHref="/tabs/my-home" /><AppText variant="heading" align="center" className="mt-16">Appliance not found</AppText></AppScreen>;
  const save = async () => { if ((purchaseDate && !parseDate(purchaseDate)) || (warrantyEndsAt && !parseDate(warrantyEndsAt))) return Alert.alert("Check dates", "Use YYYY-MM-DD format for purchase and warranty dates."); setBusy(true); try { await updateAppliance(appliance.id, { name: name.trim(), brand: brand.trim(), model: model.trim(), serial: serial.trim() || undefined, room: room.trim(), purchaseDate: parseDate(purchaseDate), warrantyEndsAt: parseDate(warrantyEndsAt), notes: notes.trim() || undefined }); safeGoBack(router, "/appliance/" + appliance.id); } catch { Alert.alert("Changes not saved", "Review the fields, check your connection, and try again."); } finally { setBusy(false); } };
  const remove = () => Alert.alert("Delete appliance?", "Maintenance tasks will be removed. Repair history remains available without the appliance link.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => { setBusy(true); void removeAppliance(appliance.id).then(() => router.replace("/tabs/my-home")).catch(() => Alert.alert("Appliance not deleted", "Check your connection and try again.")).finally(() => setBusy(false)); } }]);
  return <AppScreen footer={<Button label="Save Changes" loading={busy} disabled={!name.trim() || !brand.trim() || !model.trim() || !room.trim()} onPress={() => { void save(); }} />}><Header title="Edit Appliance" /><View className="mt-5 gap-3"><TextField placeholder="Appliance name" value={name} onChangeText={setName} /><TextField placeholder="Brand" value={brand} onChangeText={setBrand} /><TextField placeholder="Model" value={model} onChangeText={setModel} /><TextField placeholder="Serial number (optional)" value={serial} onChangeText={setSerial} /><TextField placeholder="Room" value={room} onChangeText={setRoom} /><TextField placeholder="Purchase date YYYY-MM-DD" value={purchaseDate} onChangeText={setPurchaseDate} /><TextField placeholder="Warranty end YYYY-MM-DD" value={warrantyEndsAt} onChangeText={setWarrantyEndsAt} /><TextInput accessibilityLabel="Appliance notes" multiline maxLength={2000} className="min-h-[120px] rounded-control border border-line bg-surface px-4 py-3 text-base text-ink dark:border-dark-line dark:bg-dark-surface dark:text-dark-ink" placeholder="Notes, documents, or service details" placeholderTextColor={colors.subtle} value={notes} onChangeText={setNotes} /></View><View className="mt-7"><Button label="Delete Appliance" variant="danger" icon={<Trash2 color={colors.white} size={18} />} loading={busy} onPress={remove} /></View></AppScreen>;
}
