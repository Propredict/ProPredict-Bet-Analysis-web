import { usePlayerProfileModal } from "@/contexts/PlayerProfileContext";

interface ClickablePlayerProps {
  playerId: number;
  children: React.ReactNode;
  className?: string;
}

export function ClickablePlayer({ playerId, children, className = "" }: ClickablePlayerProps) {
  const { openPlayer } = usePlayerProfileModal();

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[ClickablePlayer] Clicked player:', playerId);
    openPlayer(playerId);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onTouchEnd={handleClick}
      className={`cursor-pointer hover:opacity-80 transition-opacity text-left inline ${className}`}
    >
      {children}
    </span>
  );
}
