import { useEffect, useRef, useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HelpText, HStack, InfoCard, Radio, RadioGroup, Tag, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, Check, UserRound } from 'lucide-react'
import { VernLockup } from '../brand/VernLogo.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import { QUESTIONS, emptyAnswers, type Answers } from './types.ts'
import { firstUnansweredBefore, loadDraft, saveDraft } from './draft.ts'
import type { ValueProfileSuggestion } from '../persona/pass.ts'
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  initialAnswers?: Answers | null
  /** Answers suggested from a Persona Pass, shown with the reason for each. */
  suggestion?: ValueProfileSuggestion | null
  /** Label on the final button. */
  doneLabel?: string
  /** 0-based question index, from the URL. */
  step: number
  onStepChange: (step: number, options?: { replace?: boolean }) => void
  onDone: (answers: Answers) => void
  onSkip: () => void
}

export default function ValueProfileFlow({ initialAnswers, suggestion, doneLabel = 'Lagre', step, onStepChange, onDone, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => loadDraft() ?? initialAnswers ?? emptyAnswers())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const question = QUESTIONS[step]
  const value = answers[question.id] ?? null
  const suggested = suggestion?.answers[question.id] ?? null
  const hint = suggestion?.reasons[question.id]
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
        {step === 0 ? (
          <VStack gap="space-16">
            <VernLockup size={80} />
            <BodyLong>
              Hei! Fire korte spørsmål, så finner vi ut hva som betyr mest for deg. Det finnes ingen feil svar.
            </BodyLong>
          </VStack>
        ) : (
          <VernHeader><Detail textColor="subtle">Del 1 av 2</Detail></VernHeader>
        )}

        <VStack gap="space-8">
          <Detail textColor="subtle" weight="semibold">
            Spørsmål {step + 1} av {QUESTIONS.length}
          </Detail>
          <div className="vp-progress" role="progressbar" aria-label="Hvor langt du har kommet" aria-valuemin={1} aria-valuemax={QUESTIONS.length} aria-valuenow={step + 1}>
            {QUESTIONS.map((q, i) => <span key={q.id} className={i <= step ? 'is-on' : undefined} />)}
          </div>
        </VStack>

        <VStack gap="space-16" key={question.id} className="vp-step">
          <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
            <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">{question.title}</Heading>
            <HelpText title="Hvorfor spør vi om dette?" placement="left" className="vp-step__help">{question.help}</HelpText>
          </HStack>

          {hint && (
            <InfoCard data-color="info" size="small">
              <InfoCard.Header icon={<UserRound aria-hidden size="1em" />}>
                <InfoCard.Title as="h2">{suggested === null ? 'DigiU-profilen sier ikke noe om dette' : 'Forslag fra DigiU'}</InfoCard.Title>
              </InfoCard.Header>
              <InfoCard.Content>
                <BodyShort size="small">{hint}</BodyShort>
              </InfoCard.Content>
            </InfoCard>
          )}

          <RadioGroup
            legend={question.title}
            hideLegend
            description="Velg ett svar. Du kan alltid endre det senere."
            value={value === null ? '' : String(value)}
            onChange={(next: string) => answer(Number(next))}
          >
            <div className="vp-q__options">
              {question.options.map((option, i) => (
                <Radio key={option.label} value={String(i)} className="vp-q__option vern-choice">
                  <span className="vp-q__text">{option.label}</span>
                  {i === suggested && <Tag size="xsmall" variant="moderate" data-color="info" className="vp-q__suggested">Forslag</Tag>}
                  <Check aria-hidden size={24} className="vp-q__check" />
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {step === 0
            ? <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
            : <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={() => onStepChange(step - 1)}>Tilbake</Button>}
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" disabled={value === null} onClick={next}>
            {isLast ? doneLabel : 'Neste'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
