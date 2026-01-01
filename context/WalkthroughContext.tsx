import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const WALKTHROUGH_KEY = "hasSeenWalkthrough";

interface WalkthroughContextType {
  showWalkthrough: boolean | null;
  completeWalkthrough: () => Promise<void>;
  resetWalkthrough: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [showWalkthrough, setShowWalkthrough] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWalkthrough = async () => {
      try {
        const hasSeenWalkthrough = await AsyncStorage.getItem(WALKTHROUGH_KEY);
        setShowWalkthrough(hasSeenWalkthrough !== "true");
      } catch {
        setShowWalkthrough(false);
      }
    };
    checkWalkthrough();
  }, []);

  const completeWalkthrough = useCallback(async () => {
    try {
      await AsyncStorage.setItem(WALKTHROUGH_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    setShowWalkthrough(false);
  }, []);

  const resetWalkthrough = useCallback(() => {
    setShowWalkthrough(true);
  }, []);

  return (
    <WalkthroughContext.Provider value={{ showWalkthrough, completeWalkthrough, resetWalkthrough }}>
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  const context = useContext(WalkthroughContext);
  if (context === undefined) {
    throw new Error("useWalkthrough must be used within a WalkthroughProvider");
  }
  return context;
}
