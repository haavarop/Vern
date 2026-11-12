import { useEffect, useId, useRef, useState } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, InfoCard, Radio, RadioGroup, Tag, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, Check, UserRound } from 'lucide-react'
import { VernLockup } from '../brand/VernLogo.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import { QUESTIONS, chosenOptions, emptyAnswers, isComplete, type Answers } from './types.ts'
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
  /** Shown in the header, e.g. "Del 2 av 3". */
  stepLabel?: string
  /** Shown on the first question as a way back, e.g. when the flow is entered from an earlier step. */
  onBack?: () => void
}

export default function ValueProfileFlow({ initialAnswers, suggestion, doneLabel = 'Lagre', step, onStepChange, onDone, stepLabel, onBack }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => loadDraft() ?? initialAnswers ?? emptyAnswers())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const question = QUESTIONS[step]
  const value = answers[question.id] ?? null
  const suggested = chosenOptions(suggestion?.answers[question.id])
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

  function toggleOption(option: number, limit: number) {
    const next = picked.includes(option)
      ? picked.filter((i) => i !== option)
      : [...picked, option].slice(-limit)
    const updated = { ...answers, [question.id]: next.length ? next : null }
    setAnswers(updated)
    saveDraft(updated)
  }

  if (firstGap !== null) return null

  const picked = chosenOptions(value)

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        {step === 0 && !stepLabel ? (
          <VStack gap="space-16">
            <VernLockup size={80} />

          </VStack>
        ) : (
          <VernHeader />
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
          <Heading id={headingId} ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">{question.title}</Heading>
          {question.pick && <BodyLong textColor="subtle">Velg de {question.pick} viktigste</BodyLong>}

          {hint && (
            <InfoCard data-color="info" size="small">
              <InfoCard.Header icon={<UserRound aria-hidden size="1em" />}>
                <InfoCard.Title as="h2">{suggested.length === 0 ? 'DigiU-profilen sier ikke noe om dette' : 'Forslag fra DigiU'}</InfoCard.Title>
              </InfoCard.Header>
              <InfoCard.Content>
                <BodyShort size="small">{hint}</BodyShort>
              </InfoCard.Content>
            </InfoCard>
          )}

          {question.pick ? (
            <div role="group" aria-labelledby={headingId} className="vp-q__options">
              {question.options.map((option, i) => (
                <label key={option.label} className="vp-q__option vp-q__option--multi vern-choice">
                  <input
                    type="checkbox"
                    className="vp-q__input"
                    checked={picked.includes(i)}
                    onChange={() => toggleOption(i, question.pick ?? 1)}
                  />
                  <span className="vp-q__text">{option.label}</span>
                  {suggested.includes(i) && <SuggestedTag />}
                  <Check aria-hidden size={24} className="vp-q__check" />
                </label>
              ))}
            </div>
          ) : (
            <RadioGroup
              legend={question.title}
              hideLegend
              description="Velg ett svar. Du kan alltid endre det senere."
              value={typeof value === 'number' ? String(value) : ''}
              onChange={(next: string) => answer(Number(next))}
            >
              <div className="vp-q__options">
                {question.options.map((option, i) => (
                  <Radio key={option.label} value={String(i)} className="vp-q__option vern-choice">
                    <span className="vp-q__text">{option.label}</span>
                    {suggested.includes(i) && <SuggestedTag />}
                    <Check aria-hidden size={24} className="vp-q__check" />
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          )}
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className={step === 0 && onBack ? 'cta-bar__actions cta-bar__actions--stack' : 'cta-bar__actions'}>
          {step > 0 && <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={() => onStepChange(step - 1)}>Tilbake</Button>}
          {step === 0 && onBack && <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" disabled={!isComplete(question, value)} onClick={next}>
            {isLast ? doneLabel : 'Neste'}
          </Button>
        </div>
      </div>
    </Box>
  )
}

function SuggestedTag() {
  return <Tag size="xsmall" variant="moderate" data-color="info" className="vp-q__suggested">Forslag</Tag>
}
