import { useEffect, useRef, useState } from 'react'
import { BodyLong, Box, Button, Checkbox, CheckboxGroup, Detail, Heading, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { VernLockup } from '../brand/VernLogo.tsx'
import VernHeader from '../onboarding/VernHeader.tsx'
import { QUESTIONS, chosenOptions, emptyAnswers, isComplete, type Answers } from './types.ts'
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

  function answerMany(options: string[]) {
    const updated = { ...answers, [question.id]: options.length ? options.map(Number) : null }
    setAnswers(updated)
    saveDraft(updated)
  }

  if (firstGap !== null) return null

  const picked = chosenOptions(value)

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        {step === 0 ? (
          <VStack gap="space-16">
            <VernLockup size={80} />

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
          <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">{question.title}</Heading>
          {question.pick && <BodyLong textColor="subtle">Velg de {question.pick} viktigste</BodyLong>}

          {question.pick ? (
            <CheckboxGroup
              legend={question.title}
              hideLegend
              value={picked.map(String)}
              onChange={(next: string[]) => answerMany(next)}
            >
              <div className="vp-q__options">
                {question.options.map((option, i) => (
                  <Checkbox
                    key={option.label}
                    value={String(i)}
                    className="vp-q__option vern-choice"
                    disabled={picked.length >= (question.pick ?? 1) && !picked.includes(i)}
                  >
                    <span className="vp-q__text">{option.label}</span>
                    <Check aria-hidden size={24} className="vp-q__check" />
                  </Checkbox>
                ))}
              </div>
            </CheckboxGroup>
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
                    <Check aria-hidden size={24} className="vp-q__check" />
                  </Radio>
                ))}
              </div>
            </RadioGroup>
          )}
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {step === 0
            ? <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
            : <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={() => onStepChange(step - 1)}>Tilbake</Button>}
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" disabled={!isComplete(question, value)} onClick={next}>
            {isLast ? doneLabel : 'Neste'}
          </Button>
        </div>
      </div>
    </Box>
  )
}
