import { NavigatorScreenParams } from '@react-navigation/native';

export type BottomTabParamList = {
  HomeTab: undefined;
  IdentifyTab: undefined;
  SpeakersTab: undefined;
  HistoryTab: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  SpeakerDetail: { speakerId: string; speakerName: string };
  Settings: undefined;
};

