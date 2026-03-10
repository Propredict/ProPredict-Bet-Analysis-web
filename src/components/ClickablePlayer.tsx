import { usePlayerProfileModal } from "@/contexts/PlayerProfileContext";

interface ClickablePlayerProps {
  playerId: number;
  children: React.ReactNode;
  className?: string;
}

export function ClickablePlayer({ playerId, children, className = "" }: ClickablePlayerProps) {
  const { openPlayer } = usePlayerProfileModal();

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openPlayer(playerId);
      }}
      className={`cursor-pointer hover:opacity-80 transition-opacity text-left ${className}`}
    >
      {children}
    </button>
  );
}
