import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { fonts, useTheme } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** A themed screen that keeps clear of the system bars; scrolls unless `fixed`. */
export function Screen({
  children,
  fixed,
  edges = ['bottom'],
  style,
}: {
  children: ReactNode;
  fixed?: boolean;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: c.background }]}>
      {fixed ? (
        <View style={[styles.fixed, style]}>{children}</View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, style]}>{children}</ScrollView>
      )}
    </SafeAreaView>
  );
}

type TextVariant = 'title' | 'heading' | 'body' | 'muted' | 'label' | 'small';

/** Poppins text in one of the app's type styles. */
export function Txt({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}: {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
} & Omit<ComponentProps<typeof Text>, 'style'>) {
  const c = useTheme();
  const base: Record<TextVariant, TextStyle> = {
    title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36, color: c.text },
    heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 26, color: c.text },
    body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: c.text },
    muted: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: c.muted },
    label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: c.primary },
    small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: c.muted },
  };
  return (
    <Text {...rest} style={[base[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const filled = variant === 'primary' || variant === 'danger';
  const background = variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : 'transparent';
  const foreground = filled ? c.onPrimary : variant === 'ghost' ? c.muted : c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === 'secondary' && { borderWidth: 1.5, borderColor: c.primary },
        (pressed || disabled) && styles.dimmed,
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={foreground} />}
      <Text style={[styles.buttonLabel, { color: foreground }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; highlight?: boolean }) {
  const c = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: highlight ? c.primary : c.border, borderWidth: highlight ? 2 : 1 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A small rounded tag, e.g. "Great fit" or "Doh = Bb". */
export function Badge({ text, color, icon }: { text: string; color?: string; icon?: IconName }) {
  const c = useTheme();
  const tint = color ?? c.primary;
  return (
    <View style={[styles.badge, { backgroundColor: tint + '22' }]}>
      {icon && <Ionicons name={icon} size={14} color={tint} />}
      <Text style={[styles.badgeText, { color: tint }]}>{text}</Text>
    </View>
  );
}

/** A choice button that stays highlighted when selected. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: c.primary, backgroundColor: selected ? c.primary : 'transparent' }]}
    >
      <Text style={[styles.chipText, { color: selected ? c.onPrimary : c.primary }]}>{label}</Text>
    </Pressable>
  );
}

/** A horizontal bar from 0 to 1. */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: c.border }]}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color ?? c.accent }]} />
    </View>
  );
}

/** A round icon in a soft tinted circle. */
export function IconBubble({ name, color, size = 22 }: { name: IconName; color?: string; size?: number }) {
  const c = useTheme();
  const tint = color ?? c.primary;
  return (
    <View style={[styles.bubble, { width: size * 2, height: size * 2, borderRadius: size, backgroundColor: tint + '1f' }]}>
      <Ionicons name={name} size={size} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fixed: { flex: 1, padding: 20, gap: 14 },
  scroll: { padding: 20, gap: 14, paddingBottom: 32 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
  },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 16 },
  dimmed: { opacity: 0.55 },
  card: { borderRadius: 20, padding: 18, gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 13 },
  chip: { borderWidth: 1.5, borderRadius: 18, paddingVertical: 6, paddingHorizontal: 14 },
  chipText: { fontFamily: fonts.medium, fontSize: 14 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  bubble: { alignItems: 'center', justifyContent: 'center' },
});
