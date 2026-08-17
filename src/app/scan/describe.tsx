import { useRouter } from "expo-router";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";
import { useScan } from "@/features/diagnosis/scan-context";
export default function DescribeProblemScreen(){const router=useRouter();const{description,setDescription}=useScan();const[local,setLocal]=useState(description);const next=()=>{setDescription(local);router.push("/scan/camera")};return <AppScreen footer={<Button label="Add a photo" disabled={local.trim().length<10} onPress={next}/>}><Header title="Describe the problem"/><AppText variant="title" className="mt-6">What’s happening?</AppText><AppText variant="body" color={colors.muted} className="mt-2">Include symptoms, sounds, smells, visible damage, and any displayed error code. Do not approach an active hazard to collect details.</AppText><View className="mt-6 min-h-[220px] rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface"><TextInput multiline maxLength={300} autoFocus className="min-h-[170px] text-base text-ink dark:text-dark-ink" placeholder="Describe the problem…" placeholderTextColor={colors.subtle} value={local} onChangeText={setLocal}/><AppText variant="caption" align="right">{local.length}/300</AppText></View></AppScreen>}
