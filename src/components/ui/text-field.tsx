import type { ComponentProps } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react-native";
import { useState } from "react";

import { useThemeColors } from "@/constants/design";

type TextFieldProps = ComponentProps<typeof TextInput> & {
  kind?: "email" | "password" | "plain";
};

export function TextField({ kind = "plain", secureTextEntry, ...props }: TextFieldProps) {
  const theme = useThemeColors();
  const [hidden, setHidden] = useState(kind === "password" || Boolean(secureTextEntry));
  const Icon = kind === "email" ? Mail : kind === "password" ? LockKeyhole : null;

  return (
    <View className="min-h-[54px] flex-row items-center rounded-control border border-line bg-surface px-4 dark:border-dark-line dark:bg-dark-surface">
      {Icon ? <Icon color={theme.subtle} size={20} /> : null}
      <TextInput
        {...props}
        className="flex-1 px-3 py-4 text-base text-ink dark:text-dark-ink"
        placeholderTextColor={theme.subtle}
        secureTextEntry={hidden}
      />
      {kind === "password" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          className="h-11 w-11 items-center justify-center"
          onPress={() => setHidden((value) => !value)}
        >
          {hidden ? <Eye color={theme.subtle} size={20} /> : <EyeOff color={theme.subtle} size={20} />}
        </Pressable>
      ) : null}
    </View>
  );
}
