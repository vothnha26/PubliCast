// Inline SVG flags instead of 🇬🇧/🇻🇳 emoji — country-flag emoji render as
// two separate regional-indicator letters ("GB"/"VN") on devices/fonts that
// lack a flag emoji font (common on Android), which reads as broken text in
// the language switcher rather than a flag.
export function FlagIcon({ country, size = 14, className = "" }) {
  if (country === "GB") {
    return (
      <svg width={size} height={size} viewBox="0 0 60 30" className={className} aria-hidden="true">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" strokeWidth="2" />
        <path d="M30,0 30,30 M0,15 60,15" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 30,30 M0,15 60,15" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  }
  if (country === "VN") {
    return (
      <svg width={size} height={size} viewBox="0 0 30 20" className={className} aria-hidden="true">
        <rect width="30" height="20" fill="#DA251D" />
        <polygon
          points="15,4 16.76,9.53 22.57,9.53 17.9,12.94 19.65,18.47 15,15.06 10.35,18.47 12.1,12.94 7.43,9.53 13.24,9.53"
          fill="#FFFF00"
        />
      </svg>
    );
  }
  return null;
}
