import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Alert, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useHome } from "@/features/home/home-context";

const washer = require("../../../assets/images/fixlens/washer-hero.png");

export default function ApplianceDetectedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; brand?: string; model?: string; serial?: string; confidence?: string; imageUri?: string; scanSessionId?: string }>();
  const { addAppliance } = useHome();
  const [name, setName] = useState(params.name ?? "");
  const [brand, setBrand] = useState(params.brand ?? "");
  const [model, setModel] = useState(params.model ?? "");
  const [serial, setSerial] = useState(params.serial ?? "");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try { const item = await addAppliance({ name: name.trim(), brand: brand.trim(), model: model.trim(), serial: serial.trim(), room: room.trim(), scanSessionId: params.scanSessionId }); router.replace({ pathname: "/appliance/[applianceId]", params: { applianceId: item.id } }); }
    catch (error) { if (error instanceof Error && error.message.includes("one appliance")) Alert.alert("Free appliance limit reached", "FixLens Free includes one appliance.", [{ text: "Not now", style: "cancel" }, { text: "View Pro", onPress: () => router.push("/subscription/paywall") }]); else Alert.alert("Appliance not saved", "Check your connection and try again."); }
    finally { setBusy(false); }
  };

  return <AppScreen footer={<Button label="Add to My Home" disabled={!name.trim() || !brand.trim() || !model.trim() || !room.trim()} loading={busy} onPress={() => { void save(); }} />}>
    <Header />
    <View className="mt-3 items-center">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-safe-soft dark:bg-dark-safe-soft"><Check color={colors.safe} size={42} /></View>
      <AppText variant="title" className="mt-4">Confirm appliance</AppText>
      <AppText variant="body" color={colors.muted}>Enter or confirm the details from the label.</AppText>
      {params.confidence ? <AppText variant="caption" color={colors.caution} className="mt-2">AI extraction confidence: {Math.round(Number(params.confidence) * 100)}%. Verify every field.</AppText> : null}
    </View>
    <Image source={params.imageUri ? { uri: params.imageUri } : washer} contentFit="cover" style={{ width: 144, height: 144, borderRadius: 18 }} className="mx-auto mt-6 h-36 w-36 rounded-card" />
    <View className="mt-6 gap-3">
      <TextField placeholder="Appliance name" value={name} onChangeText={setName} />
      <TextField placeholder="Brand" value={brand} onChangeText={setBrand} />
      <TextField placeholder="Model" value={model} onChangeText={setModel} />
      <TextField placeholder="Serial number (optional)" value={serial} onChangeText={setSerial} />
      <TextField placeholder="Room" value={room} onChangeText={setRoom} />
    </View>
  </AppScreen>;
}
