/**
 * "Buy Me a Beer" support button.
 * Beer-gold pill linking to the ProPredict Buy Me a Coffee page.
 */
function BeerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* beer fill */}
      <path
        d="M5.8 12h8.4v6.5a1.7 1.7 0 0 1-1.7 1.7H7.5a1.7 1.7 0 0 1-1.7-1.7V12Z"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="none"
      />
      {/* mug body */}
      <path d="M5.8 9.4v9.1A2.5 2.5 0 0 0 8.3 21h3.4a2.5 2.5 0 0 0 2.5-2.5V9.4" />
      {/* handle */}
      <path d="M14.2 11.6h2.1a1.9 1.9 0 0 1 1.9 1.9v2.3a1.9 1.9 0 0 1-1.9 1.9h-2.1" />
      {/* foam */}
      <path d="M5.8 9.4c1-2.1 3-3.1 5-3.1s4 1 5 3.1" />
      <path d="M8.6 6.9c.2-1 .9-1.6 1.8-1.6" />
    </svg>
  );
}

export function SupportButton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <a
        href="https://www.buymeacoffee.com/propredict"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy Me a Beer – support ProPredict"
        className="btn-beer inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-extrabold tracking-wide transition-all duration-200 sm:text-base"
      >
        <BeerIcon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
        <span>Buy Me a Beer</span>
      </a>
    </div>
  );
}

export default SupportButton;
