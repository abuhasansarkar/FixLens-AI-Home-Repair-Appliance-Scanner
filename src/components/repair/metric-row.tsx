import { View } from "react-native";
import { AppText } from "@/components/ui/typography";
import { colors } from "@/constants/design";

export function MetricRow() { return <View className="mt-4 flex-row rounded-control border border-line dark:border-dark-line bg-surface dark:bg-dark-surface py-4">{[["Difficulty", "Easy"], ["Time", "15–25 min"], ["Est. Cost", "$0–$30"]].map(([label, value], index) => <View key={label} className={index ? "flex-1 items-center border-l border-line dark:border-dark-line" : "flex-1 items-center"}><AppText variant="caption">{label}</AppText><AppText variant="heading" color={index === 1 ? colors.ink : colors.safe} className="mt-1">{value}</AppText></View>)}</View>; }
