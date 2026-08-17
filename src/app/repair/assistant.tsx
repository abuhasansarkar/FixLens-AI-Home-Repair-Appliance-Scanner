import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useRouter } from "expo-router";
import { Paperclip, Send, ShieldCheck, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { useRepair } from "@/features/repairs/repair-context";
import { convexApi } from "@/services/convex-references";

type Message = { role: "user" | "assistant"; text: string; createdAt: number };

function ConnectedAssistant() {
  const router = useRouter();
  const { active } = useRepair();
  const usage = useQuery(convexApi.usage.summary, {});
  const stored = useQuery(convexApi.assistant.list, active.sessionId ? { sessionId: active.sessionId } : "skip");
  const chat = useAction(convexApi.diagnoses.chat);
  const generateUploadUrl = useMutation(convexApi.assistant.generateAttachmentUploadUrl);
  const completeUpload = useMutation(convexApi.assistant.completeAttachmentUpload);
  const normalizeAttachment = useAction(convexApi.diagnoses.normalizeAssistantAttachment);
  const [text, setText] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [photo, setPhoto] = useState<{uri:string;width:number;height:number}>();
  const messages = (stored?.messages ?? []).filter((message): message is Message => message.role === "user" || message.role === "assistant");
  const replies = messages.filter((message) => message.role === "assistant").length;
  const replyLimit = stored?.replyLimit ?? 5;

  if (usage?.entitlement === "free") return <AppScreen footer={<Button label="View FixLens Pro" onPress={() => router.push("/subscription/paywall")} />}><Header title="FixLens Assistant" /><AppText variant="heading" align="center" className="mt-12">The repair assistant is a Pro feature</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Pro includes up to five server-validated AI replies for each diagnosis.</AppText></AppScreen>;
  if (!active.sessionId) return <AppScreen><Header title="FixLens Assistant" /><AppText variant="heading" align="center" className="mt-12">No active diagnosis</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Open the assistant from a completed diagnosis or repair guide.</AppText></AppScreen>;

  const send = async () => {
    const question = text.trim();
    if (!question || busy || replies >= replyLimit) return;
    setText(""); setBusy(true); setError(undefined); setPendingQuestion(question);
    try { let attachmentId:string|undefined;if(photo){const blob=await(await fetch(photo.uri)).blob();const target=await generateUploadUrl({sessionId:active.sessionId!});const response=await fetch(target,{method:"POST",headers:{"Content-Type":"image/jpeg"},body:blob});if(!response.ok)throw new Error("Photo upload failed");const uploaded=await response.json() as {storageId?:string};if(!uploaded.storageId)throw new Error("Photo upload failed");attachmentId=await completeUpload({sessionId:active.sessionId!,storageId:uploaded.storageId,mime:"image/jpeg",size:blob.size,width:photo.width,height:photo.height});await normalizeAttachment({attachmentId});} await chat({ sessionId: active.sessionId!, question, currentStep: active.currentStep, attachmentId }); setPhoto(undefined); }
    catch (cause) { setError(cause instanceof Error && cause.message.includes("limit") ? "This diagnosis has reached its five-reply limit." : "The assistant couldn’t reply. No reply was consumed; try again."); }
    finally { setBusy(false); setPendingQuestion(undefined); }
  };

  const choosePhoto = async (camera:boolean) => { const permission=camera?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted){Alert.alert("Photo permission needed",`Allow ${camera?"camera":"photo library"} access in device settings to attach a photo.`);return;}const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:0.9}):await ImagePicker.launchImageLibraryAsync({mediaTypes:["images"],quality:0.9});if(result.canceled)return;const asset=result.assets[0];const resized=await ImageManipulator.manipulateAsync(asset.uri,Math.max(asset.width,asset.height)>1600?[{resize:asset.width>=asset.height?{width:1600}:{height:1600}}]:[],{compress:0.8,format:ImageManipulator.SaveFormat.JPEG});setPhoto({uri:resized.uri,width:resized.width,height:resized.height});};
  const offerPhoto = () => Alert.alert("Attach a photo","Use one current photo of this repair step. Do not approach a hazard to take it.",[{text:"Cancel",style:"cancel"},{text:"Camera",onPress:()=>{void choosePhoto(true);}},{text:"Photo Library",onPress:()=>{void choosePhoto(false);}}]);

  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1"><AppScreen scroll={false}><Header title="FixLens Assistant" /><AppText variant="caption" align="center">{active.appliance} · {active.issue}</AppText><View className="mt-4 flex-row gap-3 rounded-card border border-[#BBD3FF] bg-brand-soft p-3 dark:bg-dark-brand-soft"><ShieldCheck color={colors.brand} size={20} /><AppText variant="caption" className="flex-1">Answers use this diagnosis and current step. Stop if the real conditions differ or become unsafe.</AppText></View><ScrollView className="mt-4 flex-1" contentContainerClassName="gap-3 pb-4" keyboardShouldPersistTaps="handled">{messages.map((message) => <View key={`${message.role}-${message.createdAt}`} className={message.role === "assistant" ? "max-w-[88%] self-start rounded-card border border-line bg-surface p-4 dark:border-dark-line dark:bg-dark-surface" : "max-w-[88%] self-end rounded-card bg-brand p-4"}><AppText variant="body" color={message.role === "user" ? colors.white : undefined}>{message.text}</AppText></View>)}{pendingQuestion ? <View className="max-w-[88%] self-end rounded-card bg-brand p-4"><AppText variant="body" color={colors.white}>{pendingQuestion}</AppText></View> : null}{busy ? <AppText variant="caption" color={colors.muted}>FixLens is checking the diagnosis…</AppText> : null}{error ? <AppText variant="caption" align="center" color={colors.danger}>{error}</AppText> : null}{replies >= replyLimit ? <AppText variant="caption" align="center" color={colors.caution}>This diagnosis has reached its {replyLimit}-reply assistant limit.</AppText> : null}</ScrollView>{photo?<View className="mb-2 self-start"><Image accessibilityLabel="Photo attached to assistant question" source={{uri:photo.uri}} style={{ width: 80, height: 80, borderRadius: 14 }} className="h-20 w-20 rounded-control"/><Pressable accessibilityRole="button" accessibilityLabel="Remove attached photo" className="absolute -right-2 -top-2 h-8 w-8 items-center justify-center rounded-full bg-ink" onPress={()=>setPhoto(undefined)}><X color={colors.white} size={16}/></Pressable></View>:null}<AppText variant="caption" align="right" className="mb-2">{Math.max(0,replyLimit-replies)} replies remaining</AppText><View className="flex-row items-center gap-2 rounded-card border border-line bg-surface p-2 dark:border-dark-line dark:bg-dark-surface"><Pressable accessibilityRole="button" accessibilityLabel="Attach optional photo" disabled={busy||replies>=replyLimit} className="h-11 w-11 items-center justify-center rounded-full disabled:opacity-40" onPress={offerPhoto}><Paperclip color={colors.brand} size={20}/></Pressable><TextInput accessibilityLabel="Ask about this repair step" className="min-h-11 flex-1 px-2 text-base text-ink dark:text-dark-ink" maxLength={500} placeholder="Ask about this repair step" placeholderTextColor={colors.subtle} value={text} onChangeText={setText} /><Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!text.trim() || busy || replies >= replyLimit} className="h-11 w-11 items-center justify-center rounded-full bg-brand disabled:opacity-40" onPress={() => { void send(); }}><Send color={colors.white} size={20} /></Pressable></View></AppScreen></KeyboardAvoidingView>;
}

export default function RepairAssistantScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <ConnectedAssistant />;
  return <AppScreen><Header title="FixLens Assistant" /><AppText variant="heading" align="center" className="mt-12">Assistant service unavailable</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Configure Clerk, Convex, RevenueCat, and OpenAI to enable authenticated replies.</AppText></AppScreen>;
}
