import { View } from "react-native";

export function ProgressDots({ total, current, connected = false }: { total: number; current: number; connected?: boolean }) {
  return (
    <View accessibilityLabel={`Step ${current} of ${total}`} accessibilityRole="progressbar" className="flex-row items-center justify-center">
      {Array.from({ length: total }, (_, index) => <View key={index} className="flex-row items-center">
        {connected && index ? <View className={index + 1 <= current ? "h-0.5 w-11 bg-brand" : "h-0.5 w-11 bg-line dark:bg-dark-line"} /> : null}
        {!connected && index ? <View className="w-2" /> : null}
        <View className={(connected ? index + 1 <= current : index + 1 === current)
          ? "h-2.5 w-2.5 rounded-full bg-brand"
          : "h-2.5 w-2.5 rounded-full bg-line dark:bg-dark-line"}
        />
      </View>)}
    </View>
  );
}
