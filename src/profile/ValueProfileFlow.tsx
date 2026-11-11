import { useEffect, useRef, useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon, ArrowRightIcon, ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import { QUESTIONS, SCALE_LABELS, SCALE_MAX, defaultAnswers, type Answers } from './types.ts'
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  initialAnswers?: Answers | null
  /** Label on the final button. */
  doneLabel?: string
  onDone: (answers: Answers) => void
  onSkip: () => void
}

function Slider({ id, label, value, scale, onChange }: {
  id: string
  label: string
  value: number
  scale: [string, string]
  onChange: (value: number) => void
}) {
  const fill = `${(value / SCALE_MAX) * 100}%`
  return (
    <div className="vp-slider">
      <HStack justify="space-between" align="baseline" gap="space-8" wrap={false}>
        <label htmlFor={id}><BodyShort weight="semibold">{label}</BodyShort></label>
        <Detail textColor="subtle" className="vp-slider__value" aria-hidden>{SCALE_LABELS[value]}</Detail>
      </HStack>
      <input
        id={id}
        type="range"
        className="vp-slider__input"
        min={0}
        max={SCALE_MAX}
        step={1}
        value={value}
        style={{ '--fill': fill } as React.CSSProperties}
        aria-valuetext={SCALE_LABELS[value]}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="vp-slider__ticks" aria-hidden>
        {Array.from({ length: SCALE_MAX + 1 }, (_, i) => <span key={i} className={i <= value ? 'is-on' : undefined} />)}
      </div>
      <HStack justify="space-between" aria-hidden>
        <Detail textColor="subtle">{scale[0]}</Detail>
        <Detail textColor="subtle">{scale[1]}</Detail>
      </HStack>
    </div>
  )
}

export default function ValueProfileFlow({ initialAnswers, doneLabel = 'Lagre', onDone, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers ?? defaultAnswers())
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const question = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  useEffect(() => { if (step > 0) headingRef.current?.focus() }, [step])

  function set(optionId: string, value: number) {
    setAnswers((current) => ({ ...current, [question.id]: { ...current[question.id], [optionId]: value } }))
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <HStack gap="space-8" align="center" justify="space-between">
          <HStack gap="space-8" align="center">
            <ShieldCheckmarkIcon aria-hidden fontSize="1.75rem" className="onboarding__logo" />
            <Heading level="2" size="small">Vern</Heading>
          </HStack>
          <Detail textColor="subtle">Profil · steg 1 av 2</Detail>
        </HStack>

        <VStack gap="space-8">
          <Detail textColor="subtle" weight="semibold" className="vp-eyebrow">
            Verdiprofil · spørsmål {step + 1} av {QUESTIONS.length}
          </Detail>
          <div className="vp-progress" role="progressbar" aria-label="Fremdrift" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={step + 1}>
            {QUESTIONS.map((q, i) => <span key={q.id} className={i <= step ? 'is-on' : undefined} />)}
          </div>
        </VStack>

        <VStack gap="space-8" key={question.id} className="vp-question">
          <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-question__title">{question.title}</Heading>
          <BodyLong textColor="subtle">{question.hint}</BodyLong>
        </VStack>

        <Box as="section" key={`${question.id}-card`} aria-label={question.title} background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle" className="vp-question">
          <VStack gap="space-0" className="vp-sliders">
            {question.options.map((option) => (
              <Slider
                key={option.id}
                id={`${question.id}-${option.id}`}
                label={option.label}
                value={answers[question.id][option.id]}
                scale={question.scale}
                onChange={(value) => set(option.id, value)}
              />
            ))}
          </VStack>
        </Box>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {step === 0
            ? <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
            : <Button variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={() => setStep(step - 1)}>Tilbake</Button>}
          <Button
            icon={isLast ? undefined : <ArrowRightIcon aria-hidden />}
            iconPosition="right"
            onClick={() => (isLast ? onDone(answers) : setStep(step + 1))}
          >
            {isLast ? doneLabel : 'Neste'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
