/**
 * "Buy Me a Coffee / Buy Me a Beer" support button.
 * Official yellow BMC button image, links to the ProPredict BMC page.
 */
export function SupportButton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <a
        href="https://www.buymeacoffee.com/propredict"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy Me a Coffee – support ProPredict"
      >
        <img
          src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
          alt="Buy Me a Coffee"
          className="h-[42px] w-auto sm:h-[60px] sm:w-[217px]"
          loading="lazy"
        />
      </a>
    </div>
  );
}

export default SupportButton;
