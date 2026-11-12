import { useEffect, useRef, useState } from 'react'
import { BodyLong, Box, Button, Heading, HStack, Radio, RadioGroup, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import VernHeader from '../onboarding/VernHeader.tsx'
import '../onboarding/onboarding.css'
import '../profile/profile.css'
import { type ChoiceQuestionCopy } from './questions.ts'

type Props = ChoiceQuestionCopy & {
  initialValue?: boolean | null
  onAnswer: (yes: boolean) => void
  onBack?: () => void
  stepLabel?: string
}

/** A single yes/no question page, laid out like a value-profile question. */
export default function ChoiceQuestion(props: Props) {
  // A new question (e.g. a new route reusing this component) starts with its own answer.
  return <ChoiceQuestionPage key={props.title} {...props} />
}

function ChoiceQuestionPage({ title, description, yesLabel = 'Ja', noLabel = 'Nei', initialValue = null, onAnswer, onBack }: Props) {
  const [value, setValue] = useState<boolean | null>(initialValue)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to the question so screen readers announce the new page.
  useEffect(() => { headingRef.current?.focus() }, [])

  const options = [{ value: 'ja', label: yesLabel }, { value: 'nei', label: noLabel }]

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader />

        <VStack gap="space-16" className="vp-step">
          <VStack gap="space-8">
            <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
              <Heading ref={headingRef} tabIndex={-1} level="1" size="large" className="vp-step__title">{title}</Heading>
            </HStack>
            {description && <BodyLong>{description}</BodyLong>}
          </VStack>

          <RadioGroup
            legend={title}
            hideLegend
            description="Velg ett svar."
            value={value === null ? '' : value ? 'ja' : 'nei'}
            onChange={(next: string) => setValue(next === 'ja')}
          >
            <div className="vp-q__options">
              {options.map((option) => (
                <Radio key={option.value} value={option.value} className="vp-q__option vern-choice">
                  <span className="vp-q__text">{option.label}</span>
                  <Check aria-hidden size={24} className="vp-q__check" />
                </Radio>
              ))}
            </div>
          </RadioGroup>
        </VStack>
      </VStack>

      <div className="cta-bar">
        <div className="cta-bar__actions">
          {onBack && <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right" disabled={value === null} onClick={() => value !== null && onAnswer(value)}>
            Neste
          </Button>
        </div>
      </div>
    </Box>
  )
}
