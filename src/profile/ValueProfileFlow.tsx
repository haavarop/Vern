import { useEffect, useRef, useState } from 'react'
import { Box, Button, Detail, Heading, HelpText, HStack, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { ArrowLeftIcon, ArrowRightIcon, ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import { QUESTIONS, emptyAnswers, type Answers } from './types.ts'
import { firstUnansweredBefore, loadDraft, saveDraft } from './draft.ts'
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  initialAnswers?: Answers | null
  /** Label on the final button. */
  doneLabel?: string
  /** 0-based question index, from the URL. */
  step: number
  onStepChange: (step: number, options?: { replace?: boolean }) => void
  onDone: (answers: Answers) => void
  onSkip: () => void
}

export default function ValueProfileFlow({ initialAnswers, doneLabel = 'Lagre', step, onStepChange, onDone, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => loadDraft() ?? initialAnswers ?? emptyAnswers())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const question = QUESTIONS[step]
  const value = answers[question.id] ?? null
  const isLast = step === QUESTIONS.length - 1

  // Move focus to the new question so screen readers announce it.
  useEffect(() => { if (step > 0) headingRef.current?.focus() }, [step])

  // Deep links can't skip past unanswered questions.
  const firstGap = firstUnansweredBefore(answers, step)
  useEffect(() => { if (firstGap !== null) onStepChange(firstGap, { replace: true }) }, [firstGap, onStepChange])

  function next() {
    if (isLast) onDone(answers)
    else onStepChange(step + 1)
  }

  function answer(option: number) {
    const updated = { ...answers, [question.id]: option }
    setAnswers(updated)
    saveDraft(updated)
  }

  if (firstGap !== null) return null

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

        <VStack gap="space-16" key={question.id} className="vp-step">
          <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
            <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">{question.title}</Heading>
            <HelpText title="Hvorfor spør vi om dette?" placement="left" className="vp-step__help">{question.help}</HelpText>
          </HStack>

          <RadioGroup
            legend={question.title}
            hideLegend
            description="Velg det som passer deg best."
            value={value === null ? '' : String(value)}
            onChange={(next: string) => answer(Number(next))}
          >
            <div className="vp-q__options">
              {question.options.map((option, i) => (
                <Radio key={option.label} value={String(i)} className="vp-q__option">{option.label}</Radio>
              ))}
            </div>
          </RadioGroup>
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {step === 0
            ? <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
            : <Button variant="tertiary" icon={<ArrowLeftIcon aria-hidden />} onClick={() => onStepChange(step - 1)}>Tilbake</Button>}
          <Button icon={<ArrowRightIcon aria-hidden />} iconPosition="right" disabled={value === null} onClick={next}>
            {isLast ? doneLabel : 'Neste'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
