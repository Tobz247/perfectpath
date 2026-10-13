import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export const colors = {
  primary: '#3b5bdb',
  danger: '#c92a2a',
  text: '#1a1a1a',
  muted: '#666',
  border: '#dde1e6',
  card: '#f5f7fa',
  good: '#2b8a3e',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 28, alignItems: 'center' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  dimmed: { opacity: 0.6 },
  label: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryLabel: { color: colors.primary },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16 },
});
