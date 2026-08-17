import * as Linking from "expo-linking";
import { Pressable, View } from "react-native";

import { AppScreen } from "@/components/ui/app-screen";
import { Header } from "@/components/ui/header";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

export function LegalScreen({ title, updated, version, canonicalUrl, draftWhenMissing=true, sections }: { title: string; updated: string; version: string; canonicalUrl?: string; draftWhenMissing?: boolean; sections: { heading: string; body: string }[] }) {
  return (
    <AppScreen>
      <Header title={title} />
      <AppText variant="caption" className="mt-4">Version {version} · Last updated: {updated}</AppText>
      {canonicalUrl?<Pressable accessibilityRole="link" className="mt-3 min-h-11 justify-center" onPress={()=>{void Linking.openURL(canonicalUrl);}}><AppText variant="label" color={colors.brand}>View canonical published policy</AppText></Pressable>:draftWhenMissing?<View className="mt-3 rounded-control border border-caution bg-caution-soft p-3 dark:bg-dark-caution-soft"><AppText variant="label" color={colors.caution}>Draft legal copy — not approved for production</AppText></View>:null}
      <View className="mt-6 gap-7">
        {sections.map((section) => (
          <View key={section.heading}>
            <AppText variant="heading">{section.heading}</AppText>
            <AppText variant="body" color={colors.muted} className="mt-2">{section.body}</AppText>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}
