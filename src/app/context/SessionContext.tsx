import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RecognitionResult } from '../../domain/recognition';
import { SpeakerProfile } from '../../domain/speaker';
import { SpeakerRecognitionService } from '../../services/speakerRecognition/SpeakerRecognitionService';
import { defaultSpeakerService } from '../../services/speakerRecognition/MockSpeakerRecognitionService';
import { onDeviceSpeakerService } from '../../services/speakerRecognition/OnDeviceSpeakerRecognitionService';

export type AppRecognitionMode = 'real' | 'mock';

interface SessionContextType {
  history: RecognitionResult[];
  speakers: SpeakerProfile[];
  addResult: (result: RecognitionResult) => void;
  clearHistory: () => void;
  service: SpeakerRecognitionService;
  isLoadingSpeakers: boolean;
  refreshSpeakers: () => Promise<void>;
  mode: AppRecognitionMode;
  setMode: (mode: AppRecognitionMode) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode; initialMode?: AppRecognitionMode }> = ({
  children,
  initialMode = 'real',
}) => {
  const [mode, setMode] = useState<AppRecognitionMode>(initialMode);
  const [history, setHistory] = useState<RecognitionResult[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerProfile[]>([]);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState<boolean>(true);

  const activeService = mode === 'real' ? onDeviceSpeakerService : defaultSpeakerService;

  const refreshSpeakers = useCallback(async () => {
    try {
      setIsLoadingSpeakers(true);
      const data = await activeService.getSpeakers();
      setSpeakers(data);
    } catch {
      // Keep existing speakers if error occurs
    } finally {
      setIsLoadingSpeakers(false);
    }
  }, [activeService]);

  useEffect(() => {
    refreshSpeakers();
  }, [refreshSpeakers]);

  const addResult = useCallback((result: RecognitionResult) => {
    setHistory((prev) => [result, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return (
    <SessionContext.Provider
      value={{
        history,
        speakers,
        addResult,
        clearHistory,
        service: activeService,
        isLoadingSpeakers,
        refreshSpeakers,
        mode,
        setMode,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
