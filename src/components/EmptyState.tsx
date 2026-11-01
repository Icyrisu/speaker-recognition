import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../theme';
import { AppButton } from './AppButton';
import { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionTitle,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon size={32} color={colors.textSecondary} strokeWidth={1.8} />
      </View>
      <Text style={[typography.h3, styles.title]}>{title}</Text>
      <Text style={[typography.bodySecondary, styles.description]}>{description}</Text>
      {actionTitle && onAction && (
        <View style={styles.actionWrapper}>
          <AppButton title={actionTitle} onPress={onAction} variant="secondary" size="small" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  title: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  actionWrapper: {
    marginTop: spacing.xs,
  },
});

