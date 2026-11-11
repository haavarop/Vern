import { useState } from 'react'
import { BodyLong, Box, Button, Detail, Heading, HelpText, HStack, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { ArrowRightIcon, ShieldCheckmarkIcon } from '@navikt/aksel-icons'
import { QUESTIONS, emptyAnswers, isAnswered, type Answers, type Question } from './types.ts'
import '../onboarding/onboarding.css'
import './profile.css'

type Props = {
  initialAnswers?: Answers | null
  /** Label on the final button. */
  doneLabel?: string
  onDone: (answers: Answers) => void
  onSkip: () => void
}

function QuestionRadios({ index, question, value, onChange }: {
  index: number
  question: Question
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <li className="vp-q">
      <RadioGroup
        legend={
          <HStack as="span" gap="space-8" align="start" wrap={false}>
            <span className="vp-q__num" aria-hidden>{index + 1}</span>
            <span>{question.title}</span>
          </HStack>
        }
        value={value === null ? '' : String(value)}
        onChange={(next: string) => onChange(Number(next))}
        size="small"
        className="vp-q__group"
      >
        <div className="vp-q__help">
          <HelpText title="Hvorfor spør vi om dette?" placement="left">{question.help}</HelpText>
        </div>
        <div className="vp-q__options">
          {question.options.map((option, i) => (
            <Radio key={option.label} value={String(i)} className="vp-q__option">{option.label}</Radio>
          ))}
        </div>
      </RadioGroup>
    </li>
  )
}

export default function ValueProfileFlow({ initialAnswers, doneLabel = 'Lagre', onDone, onSkip }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => initialAnswers ?? emptyAnswers())
  const answeredCount = Object.values(answers).filter((v) => v !== null).length

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
          <Heading level="1" size="large">Hva er viktig for deg?</Heading>
          <BodyLong>
            Fire raske spørsmål. Velg det svaret som passer deg best, så fremhever vi forskjellene som betyr mest for deg.
          </BodyLong>
        </VStack>

        <Box as="section" aria-label="Verdiprofil" background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <ol className="vp-questions">
            {QUESTIONS.map((question, index) => (
              <QuestionRadios
                key={question.id}
                index={index}
                question={question}
                value={answers[question.id] ?? null}
                onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              />
            ))}
          </ol>
        </Box>
        <Detail textColor="subtle" aria-live="polite">{answeredCount} av {QUESTIONS.length} besvart</Detail>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          <Button variant="tertiary" onClick={onSkip}>Hopp over</Button>
          <Button
            icon={<ArrowRightIcon aria-hidden />}
            iconPosition="right"
            disabled={!isAnswered(answers)}
            onClick={() => onDone(answers)}
          >
            {doneLabel}
          </Button>
        </div>
      </div>
    </Box>
  )
}
