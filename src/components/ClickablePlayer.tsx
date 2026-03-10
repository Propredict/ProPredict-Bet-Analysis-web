import { usePlayerProfileModal } from "@/contexts/PlayerProfileContext";

interface ClickablePlayerProps {
  playerId: number;
  children: React.ReactNode;
  className?: string;
}

export function ClickablePlayer({ playerId, children, className = "" }: ClickablePlayerProps) {
  const { openPlayer } = usePlayerProfileModal();
  const isAndroid = !!(window as any).Android;

  if (isAndroid) {
    return <span className={className}>{children}</span>;
  }

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
