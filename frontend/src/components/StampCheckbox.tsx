interface StampProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export default function StampCheckbox({ checked, onChange, label }: StampProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative w-8 h-8 shrink-0 mt-0.5 rounded-full border-2 border-ink/40 flex items-center justify-center transition-colors hover:border-oxblood"
    >
      {checked && (
        <svg
          viewBox="0 0 32 32"
          className="absolute inset-0 w-full h-full text-oxblood animate-stamp"
          style={{ transform: "rotate(-8deg)" }}
        >
          <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M10 16.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
