import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { RecognitionStatus } from '../domain/recognition';
import { ShieldAlert, CheckCircle2, HelpCircle, AlertTriangle } from 'lucide-react-native';

interface StatusBadgeProps {
  status: RecognitionStatus | 'demo';
  label?: string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'medium' }) => {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 12 : 14;

  let bg = colors.surfaceBorder;
  let text = colors.textSecondary;
  let defaultLabel = '';
  let IconComponent = HelpCircle;

  switch (status) {
    case 'demo':
      bg = colors.demoBadgeBg;
      text = colors.demoBadgeText;
      defaultLabel = 'DEMO MODE';
      IconComponent = ShieldAlert;
      break;
    case 'recognized':
      bg = colors.successSurface;
      text = colors.success;
      defaultLabel = 'RECOGNIZED';
      IconComponent = CheckCircle2;
      break;
    case 'unknown':
      bg = colors.warningSurface;
      text = colors.warning;
      defaultLabel = 'UNKNOWN';
      IconComponent = HelpCircle;
      break;
    case 'error':
      bg = colors.dangerSurface;
      text = colors.danger;
      defaultLabel = 'ERROR';
      IconComponent = AlertTriangle;
      break;
  }

  const displayText = label || defaultLabel;

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.badgeSmall]}>
      <IconComponent size={iconSize} color={text} strokeWidth={2.2} />
      <Text style={[typography.badge, { color: text }, isSmall && styles.textSmall]}>
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs + 2,
  },
  badgeSmall: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    gap: 4,
  },
  textSmall: {
    fontSize: 10,
  },
});

