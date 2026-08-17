import * as Linking from "expo-linking";
import { ChevronDown, Mail, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

const faqs = [
  { category: "Diagnoses", q: "How does a diagnosis use my allowance?", a: "One problem session consumes one diagnosis only after a valid assessment or safety escalation is stored. Extra evidence in the same session does not consume another." },
  { category: "Safety", q: "When should I stop a repair?", a: "Stop whenever conditions differ, a hazard appears, manufacturer instructions conflict, or you feel uncomfortable. Contact a qualified professional." },
  { category: "Privacy", q: "How are my photos handled?", a: "Production images are optimized, stripped of metadata, stored privately, and served only after an authenticated ownership check." },
  { category: "Subscriptions", q: "How do I restore a purchase?", a: "Open Plan & Billing from Profile, choose Restore Purchases, and use the same App Store or Play Store account used for the original purchase." },
  { category: "Appliances", q: "Why must I confirm scanned appliance details?", a: "Labels can be blurry or incomplete. Confirm the brand, model, and serial against the physical label before relying on maintenance or compatibility information." },
];

export default function HelpScreen() {
  const [open, setOpen] = useState<string>();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? faqs.filter((item) => `${item.category} ${item.q} ${item.a}`.toLocaleLowerCase().includes(normalized)) : faqs;
  }, [query]);
  return <AppScreen><Header title="Help Center"/><AppText variant="title" className="mt-5">How can we help?</AppText><View className="mt-4 flex-row items-center rounded-control border border-line dark:border-dark-line bg-surface dark:bg-dark-surface px-3"><Search color={colors.muted} size={20}/><TextInput accessibilityLabel="Search help" className="min-h-[52px] flex-1 px-3 text-base text-ink dark:text-dark-ink" placeholder="Search help topics" placeholderTextColor={colors.subtle} value={query} onChangeText={setQuery}/></View><View className="mt-5 gap-3">{visible.map((item)=><Pressable accessibilityRole="button" accessibilityState={{expanded:open===item.q}} key={item.q} className="rounded-card border border-line dark:border-dark-line bg-surface dark:bg-dark-surface p-4" onPress={()=>setOpen(open===item.q?undefined:item.q)}><AppText variant="caption" color={colors.brand}>{item.category}</AppText><View className="mt-1 flex-row items-center"><AppText variant="label" className="flex-1">{item.q}</AppText><ChevronDown color={colors.muted} size={19}/></View>{open===item.q?<AppText variant="body" color={colors.muted} className="mt-3">{item.a}</AppText>:null}</Pressable>)}{!visible.length?<View className="items-center py-10"><AppText variant="heading">No help topics found</AppText><AppText variant="body" align="center" color={colors.muted} className="mt-2">Try another search or contact support.</AppText></View>:null}</View><View className="mt-8"><Button label="Contact Support" variant="secondary" icon={<Mail color={colors.brand} size={19}/>} onPress={()=>Linking.openURL("mailto:support@fixlens.ai?subject=FixLens%20Support")}/></View></AppScreen>;
}
