import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { TextField } from "@/components/ui/text-field";
import { AppText } from "@/components/ui/typography";
import { serviceReadiness } from "@/config/env";
import { colors } from "@/constants/design";
import { convexApi } from "@/services/convex-references";

function ConfiguredHomeManager() {
  const home = useQuery(convexApi.homes.current, {});
  const renameHome = useMutation(convexApi.homes.rename);
  const addRoom = useMutation(convexApi.homes.addRoom);
  const renameRoom = useMutation(convexApi.homes.renameRoom);
  const removeRoom = useMutation(convexApi.homes.removeRoom);
  const [homeName, setHomeName] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [roomNames, setRoomNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>();

  if (home === undefined) return <AppScreen><Header title="Manage home" /><AppText variant="body" align="center" className="mt-12">Loading your home…</AppText></AppScreen>;
  if (!home) return <AppScreen><Header title="Manage home" /><AppText variant="heading" align="center" className="mt-12">Add an appliance first</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Your default home is created with your first appliance.</AppText></AppScreen>;

  const report = (error: unknown) => Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
  return <AppScreen><Header title="Manage home" /><AppText variant="heading" className="mt-5">Home name</AppText><View className="mt-3 gap-3"><TextField accessibilityLabel="Home name" placeholder={home.name} value={homeName} onChangeText={setHomeName} /><Button label="Save home name" loading={busy === "home"} disabled={!homeName.trim() || homeName.trim() === home.name} onPress={async()=>{setBusy("home");try{await renameHome({homeId:home.id,name:homeName});setHomeName("");}catch(error){report(error);}finally{setBusy(undefined);}}}/></View><AppText variant="heading" className="mt-8">Rooms</AppText><View className="mt-3 gap-3">{home.rooms.map((room)=><View key={room.id} className="rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface p-4"><View className="flex-row items-center gap-2"><View className="flex-1"><TextField accessibilityLabel={`Room name for ${room.name}`} placeholder={room.name} value={roomNames[room.id] ?? ""} onChangeText={(value)=>setRoomNames((current)=>({...current,[room.id]:value}))}/></View><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${room.name}`} disabled={room.applianceCount>0||busy===room.id} className="h-12 w-12 items-center justify-center rounded-control border border-line dark:border-dark-line disabled:opacity-40" onPress={()=>Alert.alert("Delete room?",`Delete ${room.name}?`,[{text:"Cancel",style:"cancel"},{text:"Delete",style:"destructive",onPress:async()=>{setBusy(room.id);try{await removeRoom({roomId:room.id});}catch(error){report(error);}finally{setBusy(undefined);}}}])}><Trash2 color={colors.danger} size={20}/></Pressable></View><View className="mt-2 flex-row items-center"><AppText variant="caption" className="flex-1">{room.applianceCount} appliance{room.applianceCount===1?"":"s"}</AppText><Button label="Rename" variant="ghost" loading={busy===room.id} disabled={!roomNames[room.id]?.trim()||roomNames[room.id]?.trim()===room.name} onPress={async()=>{setBusy(room.id);try{await renameRoom({roomId:room.id,name:roomNames[room.id]});setRoomNames((current)=>({...current,[room.id]:""}));}catch(error){report(error);}finally{setBusy(undefined);}}}/></View></View>)}</View><View className="mt-5 gap-3"><TextField accessibilityLabel="New room name" placeholder="New room name" value={newRoom} onChangeText={setNewRoom}/><Button label="Add room" icon={<Plus color={colors.white} size={19}/>} loading={busy==="new"} disabled={!newRoom.trim()} onPress={async()=>{setBusy("new");try{await addRoom({homeId:home.id,name:newRoom});setNewRoom("");}catch(error){report(error);}finally{setBusy(undefined);}}}/></View></AppScreen>;
}

export default function ManageHomeScreen() {
  if (serviceReadiness.authentication && serviceReadiness.backend) return <ConfiguredHomeManager />;
  return <AppScreen><Header title="Manage home" /><AppText variant="heading" align="center" className="mt-12">Backend configuration required</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Connect Clerk and Convex to manage persisted homes and rooms.</AppText></AppScreen>;
}
