import { useState, useEffect } from "react";

const WORLD_CUP_START = new Date("2026-06-11T18:00:00Z").getTime();

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, WORLD_CUP_START - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (timeLeft.days <= 0 && timeLeft.hours <= 0 && timeLeft.minutes <= 0 && timeLeft.seconds <= 0) {
    return (
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-sm font-bold text-yellow-400 animate-pulse">🏆 Tournament is LIVE!</span>
      </div>
    );
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Min", value: timeLeft.minutes },
    { label: "Sec", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-1.5 mt-3">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-1.5">
          <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 min-w-[48px] text-center">
            <p className="text-lg font-bold text-white leading-none">{String(u.value).padStart(2, "0")}</p>
            <p className="text-[8px] uppercase text-white/50 mt-0.5">{u.label}</p>
          </div>
          {i < units.length - 1 && <span className="text-white/30 text-sm font-bold">:</span>}
        </div>
      ))}
    </div>
  );
}
