import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { BodyLong, BodyShort, Box, Button, Heading, HStack, TextField, VStack } from '@navikt/ds-react'
import { ArrowLeft, CircleAlert, CircleCheck, Lock } from 'lucide-react'
import Monogram from '../onboarding/Monogram.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import { getInsurer } from '../onboarding/insurers.ts'
import { friendlyError } from '../match/api.ts'
import { formatPhone, normalizePhone } from './phone.ts'
import '../onboarding/onboarding.css'
import '../profile/profile.css'

type Props = {
  insurerId: string
  /** Receives the normalized 8-digit number. Reject to show an error and let the customer try again. */
  onSubmit: (phone: string) => Promise<void>
  onBack: () => void
}

const INVALID = 'Skriv et norsk mobil- eller fastnummer med 8 siffer, for eksempel 912 34 567.'

/** «Ditt telefonnummer»: the customer asks an insurer to call them. */
export default function CallbackForm({ insurerId, onSubmit, onBack }: Props) {
  const name = getInsurer(insurerId)?.name ?? insurerId
  const formId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  // Focus the heading on arrival and when the confirmation replaces the form.
  useEffect(() => { headingRef.current?.focus() }, [sentTo])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    const phone = normalizePhone(input)
    setInvalid(!phone)
    if (!phone) {
      inputRef.current?.focus()
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(phone)
      setSentTo(phone)
    } catch (caught) {
      setError(friendlyError(caught, 'Vi fikk ikke lagret nummeret ditt. Prøv igjen om litt.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
        <VStack gap="space-24" className="onboarding__content">
          <VernHeader />
          <VStack gap="space-16" className="vp-step">
            <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">Takk!</Heading>
            <Box className="vern-status-positive" role="status">
              <HStack gap="space-12" align="start" wrap={false}>
                <CircleCheck aria-hidden size={24} className="upload-status__icon" />
                <BodyShort weight="semibold">{name} ringer deg på {formatPhone(sentTo)}.</BodyShort>
              </HStack>
            </Box>
          </VStack>
        </VStack>

        <div className="cta-bar">
          <div className="cta-bar__actions">
            <Button icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake til matchene</Button>
          </div>
        </div>
      </Box>
    )
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader />

        <VStack gap="space-8">
          <HStack gap="space-12" align="center" wrap={false}>
            <Monogram id={insurerId} name={name} />
            <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">
              Hvor kan {name} ringe deg?
            </Heading>
          </HStack>
          <BodyLong>Legg igjen nummeret ditt, så tar {name} kontakt. Samtalen er helt uforpliktende.</BodyLong>
        </VStack>

        <form id={formId} noValidate onSubmit={submit} className="vern-card">
          <VStack gap="space-16">
            <TextField
              ref={inputRef}
              label="Telefonnummer"
              description="8 siffer. Landskode trengs ikke."
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              value={input}
              error={invalid ? INVALID : undefined}
              onChange={(event) => {
                setInput(event.target.value)
                if (invalid && normalizePhone(event.target.value)) setInvalid(false)
              }}
            />
            <HStack gap="space-12" align="start" wrap={false} className="upload-privacy">
              <Lock aria-hidden size={24} />
              <BodyShort size="small">
                Vi deler nummeret bare med {name}, og bare for denne samtalen.
              </BodyShort>
            </HStack>
          </VStack>
        </form>

        {error && (
          <div className="app-notice app-notice--error" role="alert">
            <CircleAlert aria-hidden size={24} strokeWidth={2} />
            <div className="app-notice__text">
              <BodyShort weight="semibold">Det gikk ikke helt etter planen</BodyShort>
              <BodyShort size="small">{error}</BodyShort>
            </div>
          </div>
        )}
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack} disabled={submitting}>Tilbake</Button>
          <Button type="submit" form={formId} loading={submitting}>Ring meg</Button>
        </div>
      </div>
    </Box>
  )
}
