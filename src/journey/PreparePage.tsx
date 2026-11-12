import { useEffect, useRef } from 'react'
import { BodyShort, Box, Button, Heading, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, FileText, ListChecks, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import VernHeader from '../onboarding/VernHeader.tsx'
import '../onboarding/onboarding.css'
import '../landing/landing.css'

type Props = {
  onContinue: () => void
  onBack: () => void
}

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ListChecks,
    title: 'Først noen korte spørsmål',
    text: 'Vi spør hva som er viktigst for deg, som pris, dekning og hjelp når noe skjer. Da kan vi sjekke forsikringene dine mot det du bryr deg om, ikke bare prisen.',
  },
  {
    icon: FileText,
    title: 'Ha forsikringsbeviset klart',
    text: 'Etterpå legger du til forsikringsbeviset ditt som PDF. Du finner det som regel på «Min side» hos forsikringsselskapet ditt.',
  },
  {
    icon: Lock,
    title: 'Vi passer på opplysningene dine',
    text: 'Du kan være trygg på at vi tar personvernet ditt på alvor. Vi behandler opplysningene dine i tråd med vår Personvernerklæring.',
  },
]

/** Shown after «Skal vi sjekke om de passer deg?» → Ja, before the value-profile questions. */
export default function PreparePage({ onContinue, onBack }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => { headingRef.current?.focus() }, [])

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader />

        <VStack gap="space-8">
          <Heading ref={headingRef} tabIndex={-1} level="1" size="large">Før vi sjekker dine forsikringer</Heading>
        </VStack>

        <ul className="landing__points" aria-label="Slik går det til">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="landing__point">
              <span className="stat__icon" aria-hidden><Icon size="1em" /></span>
              <div>
                <BodyShort weight="semibold">{title}</BodyShort>
                <BodyShort textColor="subtle">{text}</BodyShort>
              </div>
            </li>
          ))}
        </ul>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake</Button>
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" onClick={onContinue}>Jeg er klar</Button>
        </div>
      </div>
    </Box>
  )
}
