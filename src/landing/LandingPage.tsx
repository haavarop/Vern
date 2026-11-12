import { BodyLong, BodyShort, Box, Button, Heading, VStack } from '@navikt/ds-react'
import { ArrowRight, Clock, Scale, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { VernSymbol } from '../brand/VernLogo.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import '../onboarding/onboarding.css'
import './landing.css'

type Props = {
  onStart: () => void
}

const POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Scale, title: 'Mer enn pris', text: 'Vi ser også på dekning, hjelp når noe skjer og hvor enkelt det er.' },
  { icon: ShieldCheck, title: 'Uavhengig', text: 'Vi selger ingen forsikringer og tjener ikke på hva du velger.' },
  { icon: Clock, title: 'Gratis og raskt', text: 'Svar på noen korte spørsmål. Det tar bare noen minutter og koster ingenting.' },
]

export default function LandingPage({ onStart }: Props) {
  return (
    <Box as="main" className="onboarding landing" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-32" className="onboarding__content">
        <VernHeader />

        <section className="landing__hero" aria-labelledby="landing-heading">
          <VStack gap="space-16">
            <Heading id="landing-heading" level="1" size="xlarge" className="landing__title">
              Din <em>personlige</em> forsikringsmatch
            </Heading>
            <BodyLong size="large">
              Vern matcher deg med forsikringsselskapet som passer best for deg, på mer enn bare pris. En matchscore viser hvor godt hvert selskap passer.
            </BodyLong>
          </VStack>
          <VernSymbol size={120} className="landing__symbol" />
        </section>

        <section aria-labelledby="landing-points-heading">
          <Heading id="landing-points-heading" level="2" size="small" className="sr-only">Hvorfor Vern?</Heading>
          <ul className="landing__points">
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
        </section>
      </VStack>

      <div className="cta-bar landing__cta">
        <div className="cta-bar__actions">
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" onClick={onStart}>Kom i gang</Button>
        </div>
      </div>
    </Box>
  )
}
