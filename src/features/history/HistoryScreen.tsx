import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/routeTypes';
import { ScreenContainer, HeaderBar, ResultCard, EmptyState } from '../../components';
import { useSession } from '../../app/context/SessionContext';
import { RecognitionResult } from '../../domain/recognition';
import { spacing, colors } from '../../theme';
import { History as HistoryIcon, Trash2 } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { history, clearHistory } = useSession();

  const handleStartSimulate = () => {
    navigation.navigate('MainTabs', { screen: 'IdentifyTab' });
  };

  const renderHistoryItem = ({ item }: { item: RecognitionResult }) => {
    return <ResultCard result={item} compact={false} />;
  };

  return (
    <ScreenContainer>
      <HeaderBar
        title="Session History"
        subtitle={`${history.length} simulation records in memory`}
        rightAction={
          history.length > 0 ? (
            <TouchableOpacity
              onPress={clearHistory}
              style={styles.clearAction}
              accessibilityRole="button"
              accessibilityLabel="Clear history"
            >
              <Trash2 size={18} color={colors.danger} />
              <Text style={styles.clearActionText}>Clear</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {history.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No Simulations Yet"
          description="Simulate recognition to view inference duration, confidence scores, and status history."
          actionTitle="Start First Simulation"
          onAction={handleStartSimulate}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  clearAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
});
