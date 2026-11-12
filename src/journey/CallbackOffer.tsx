import { useId } from 'react'
import { BodyShort, Button, Heading } from '@navikt/ds-react'
import { CircleCheck, Phone } from 'lucide-react'
import Monogram from '../onboarding/Monogram.tsx'
import { getInsurer } from '../onboarding/insurers.ts'
import './journey.css'

type Props = {
  insurerId: string
  onAccept: () => void
  /** The customer has already asked this insurer to call. */
  requested?: boolean
}

/** «Vil du bli ringt opp av X?» on the result page. An offer, never a push: ignoring it is fine. */
export default function CallbackOffer({ insurerId, onAccept, requested = false }: Props) {
  const headingId = useId()
  const name = getInsurer(insurerId)?.name ?? insurerId

  return (
    <section aria-labelledby={headingId} className={requested ? 'callback-offer vern-status-positive' : 'callback-offer vern-card'}>
      <div className="callback-offer__top">
        <Monogram id={insurerId} name={name} />
        <Heading id={headingId} level="2" size="small">
          {requested ? `Du har bedt ${name} om å ringe deg` : `Vil du bli ringt opp av ${name}?`}
        </Heading>
      </div>
      <div aria-live="polite" className="callback-offer__body">
        {requested ? (
          <p className="callback-offer__done vern-body-small">
            <CircleCheck aria-hidden size={20} strokeWidth={2} />
            <span>Dette er en demo, så ingen ringer deg på ekte. Nummeret ditt er ikke sendt videre.</span>
          </p>
        ) : (
          <>
            <BodyShort size="small">
              Helt uforpliktende. Vern selger ingenting, og du bestemmer selv om du vil gå videre.
            </BodyShort>
            <Button icon={<Phone aria-hidden size={20} strokeWidth={2} />} onClick={onAccept}>
              Ja, ring meg
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
