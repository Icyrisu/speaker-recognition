import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomTabParamList, RootStackParamList } from './routeTypes';
import { DashboardScreen } from '../../features/dashboard/DashboardScreen';
import { IdentificationScreen } from '../../features/identification/IdentificationScreen';
import { SpeakersScreen } from '../../features/speakers/SpeakersScreen';
import { SpeakerDetailScreen } from '../../features/speakers/SpeakerDetailScreen';
import { HistoryScreen } from '../../features/history/HistoryScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { colors } from '../../theme';
import { Home, AudioLines, Users, History } from 'lucide-react-native';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

interface IconProps {
  color: string;
  size: number;
}

const HomeIcon = ({ color, size }: IconProps) => <Home size={size} color={color} />;
const IdentifyIcon = ({ color, size }: IconProps) => <AudioLines size={size} color={color} />;
const SpeakersIcon = ({ color, size }: IconProps) => <Users size={size} color={color} />;
const HistoryIcon = ({ color, size }: IconProps) => <History size={size} color={color} />;

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeIcon,
        }}
      />
      <Tab.Screen
        name="IdentifyTab"
        component={IdentificationScreen}
        options={{
          tabBarLabel: 'Identify',
          tabBarIcon: IdentifyIcon,
        }}
      />
      <Tab.Screen
        name="SpeakersTab"
        component={SpeakersScreen}
        options={{
          tabBarLabel: 'Speakers',
          tabBarIcon: SpeakersIcon,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: HistoryIcon,
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="SpeakerDetail"
          component={SpeakerDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.surfaceBorder,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
