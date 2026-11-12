import type { CSSProperties } from 'react'

/*
 * React versions of the official logo files in public/brand/. Geometry, colours and font
 * sizes are copied from the SVGs so the components render identically, but inline so the
 * page's web fonts (General Sans) apply to the wordmark and tagline.
 */

const APRICOT = '#FF8A5B'
const MINT = '#BDE8D4'
const FOREST = '#0F3D33'
const CREAM = '#FAF5EE'
const LOGO_FONT = "'General Sans', 'Satoshi', 'Noto Sans', system-ui, sans-serif"

type SymbolProps = {
  size?: number | string
  className?: string
  title?: string
}

/** Two overlapping circles: you (apricot) and your insurer (mint). The overlap is the match. Mirrors vern-logo.svg. */
export function VernSymbol({ size = 32, className, title }: SymbolProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 290 260"
      width={size}
      height={typeof size === 'number' ? (size * 260) / 290 : undefined}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <circle cx="130" cy="130" r="130" fill={APRICOT} fillOpacity="0.8" />
      <circle cx="160" cy="130" r="130" fill={MINT} fillOpacity="0.7" />
    </svg>
  )
}

type WordmarkProps = {
  size?: number | string
  className?: string
  as?: 'span' | 'h1' | 'p'
}

export function VernWordmark({ size = 32, className, as: Component = 'span' }: WordmarkProps) {
  const style: CSSProperties = { fontSize: size }
  return (
    <Component className={['vern-wordmark', className].filter(Boolean).join(' ')} style={style}>
      vern
    </Component>
  )
}

type LockupProps = {
  className?: string
  /** Rendered wordmark font size in px; the rest scales with the official 200px wordmark. */
  size?: number
  /** `onDark`: cream text (vern-logo-tagline-baggrund.svg). `onLight`: forest text (vern-logo-tagline-transparent.svg). */
  variant?: 'onDark' | 'onLight'
  /** Draw the forest rounded background. Defaults to true for `onDark`; ignored for `onLight`. */
  background?: boolean
}

/** Wordmark and tagline on the left, symbol on the right. Accessible name is "Vern". */
export function VernLockup({ className, size = 48, variant = 'onDark', background = variant === 'onDark' }: LockupProps) {
  const withBackground = variant === 'onDark' && background
  const text = variant === 'onDark' ? CREAM : FOREST
  // Same viewBoxes as the official files: full canvas with background, tight crop without.
  const [x, y, w, h] = withBackground ? [0, 0, 1240, 520] : [60, 110, 1000, 300]
  const scale = size / 200
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${x} ${y} ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      className={['vern-lockup', `vern-lockup--${variant}`, className].filter(Boolean).join(' ')}
      role="img"
      aria-label="Vern"
      focusable="false"
    >
      {withBackground && <rect width="1240" height="520" rx="24" fill={FOREST} />}
      <text x="79" y="312" fontFamily={LOGO_FONT} fontSize="200" fontWeight="700" fill={text}>vern</text>
      <text x="90" y="383" fontFamily={LOGO_FONT} fontSize="33" fill={text}>
        Din <tspan fontStyle="italic">personlige</tspan> forsikringsmatch
      </text>
      <circle cx="866" cy="260" r="130" fill={APRICOT} fillOpacity="0.8" />
      <circle cx="896" cy="260" r="130" fill={MINT} fillOpacity="0.7" />
    </svg>
  )
}
