// Faceted gemstone in the silhouette of a booster pack (crimped top and bottom)
export function GemMark({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gem-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10d9a0" />
          <stop offset="0.55" stopColor="#9b5cf6" />
          <stop offset="1" stopColor="#f5b912" />
        </linearGradient>
      </defs>
      <path d="M18 4h28l8 10v38l-8 8H18l-8-8V14z" fill="url(#gem-fill)" />
      <path
        d="M18 4l6 10h16l6-10M10 14h44M24 14l8 46 8-46M10 52l14-38M54 52L40 14"
        fill="none"
        stroke="#0a1230"
        strokeOpacity=".45"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 8h36" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  )
}

export default function Logo({ showText = true }) {
  return (
    <span className="flex items-center gap-2.5">
      <GemMark />
      {showText && (
        <span className="font-display text-xl font-bold leading-none tracking-tight">
          Gempack <span className="gem-text">TCG</span>
        </span>
      )}
    </span>
  )
}
