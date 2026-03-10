import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface PlayerProfileContextType {
  openPlayer: (playerId: number) => void;
  closePlayer: () => void;
  playerId: number | null;
  isOpen: boolean;
}

const PlayerProfileContext = createContext<PlayerProfileContextType>({
  openPlayer: () => {},
  closePlayer: () => {},
  playerId: null,
  isOpen: false,
});

export function PlayerProfileProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPlayer = useCallback((id: number) => {
    setPlayerId(id);
    setIsOpen(true);
  }, []);

  const closePlayer = useCallback(() => {
    setIsOpen(false);
    // Delay clearing ID so exit animation works
    setTimeout(() => setPlayerId(null), 300);
  }, []);

  return (
    <PlayerProfileContext.Provider value={{ openPlayer, closePlayer, playerId, isOpen }}>
      {children}
    </PlayerProfileContext.Provider>
  );
}

export function usePlayerProfileModal() {
  return useContext(PlayerProfileContext);
}
