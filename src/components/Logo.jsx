// The Gempack TCG emblem: a faceted crystal "G" ringed by sparkles (public/logo.webp)
export function GemMark({ className = 'h-9 w-9' }) {
  return <img src="/logo.webp" alt="" aria-hidden="true" draggable={false} className={`${className} object-contain`} />
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
