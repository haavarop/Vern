import { hashString } from './mockPolicies.ts'

const COLORS = ['accent', 'brand-blue', 'brand-magenta', 'meta-purple', 'meta-lime', 'brand-beige', 'info'] as const

function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => /^\p{L}/u.test(word))
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2)
}

type Props = { id: string; name: string; size?: 'small' | 'medium' }

export default function Monogram({ id, name, size = 'medium' }: Props) {
  return (
    <span className={`monogram monogram--${size}`} data-color={COLORS[hashString(id) % COLORS.length]} aria-hidden>
      {initials(name)}
    </span>
  )
}
