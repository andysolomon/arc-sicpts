/** Icons are minimal geometry: 1.6px strokes with round caps, or solid shapes. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const solid = { fill: 'currentColor', 'aria-hidden': true } as const;

export const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" {...stroke}>
    <line x1="3" y1="5" x2="15" y2="5" />
    <line x1="3" y1="9" x2="15" y2="9" />
    <line x1="3" y1="13" x2="15" y2="13" />
  </svg>
);

export const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" {...stroke}>
    <circle cx="7" cy="7" r="4.5" />
    <line x1="10.5" y1="10.5" x2="14" y2="14" />
  </svg>
);

export const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...stroke}>
    <circle cx="8" cy="8" r="3.2" />
    <line x1="8" y1="1.5" x2="8" y2="3" />
    <line x1="8" y1="13" x2="8" y2="14.5" />
    <line x1="1.5" y1="8" x2="3" y2="8" />
    <line x1="13" y1="8" x2="14.5" y2="8" />
  </svg>
);

export const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...stroke}>
    <path d="M13 9.6A5.4 5.4 0 0 1 6.4 3 5.4 5.4 0 1 0 13 9.6Z" />
  </svg>
);

/** A half-filled disc: the theme follows the system. */
export const SystemThemeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" {...stroke}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" />
  </svg>
);

export const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth={1.8}>
    <polyline points="4,2 9,7 4,12" />
  </svg>
);

export const PlayIcon = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" {...solid}>
    <polygon points="0,0 10,6 0,12" />
  </svg>
);

export const StopIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" {...solid}>
    <rect width="10" height="10" rx="1.5" />
  </svg>
);

export const StepBackIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...solid}>
    <rect x="1" y="1" width="2" height="10" />
    <polygon points="11,1 4,6 11,11" />
  </svg>
);

export const StepIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" {...solid}>
    <polygon points="1,1 8,6 1,11" />
    <rect x="9" y="1" width="2" height="10" />
  </svg>
);

export const RunToEndIcon = () => (
  <svg width="14" height="12" viewBox="0 0 14 12" {...solid}>
    <polygon points="1,1 7,6 1,11" />
    <polygon points="7,1 13,6 7,11" />
  </svg>
);

export const NestedSquaresIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" {...stroke} className="mt-[3px] text-accent">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <rect x="7" y="7" width="6" height="6" rx="1" />
  </svg>
);
