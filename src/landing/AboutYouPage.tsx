import { useRef, useState, type FormEvent } from 'react'
import { BodyLong, Box, Button, Checkbox, CheckboxGroup, Heading, HStack, Radio, RadioGroup, TextField, VStack } from '@navikt/ds-react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import VernHeader from '../onboarding/VernHeader.tsx'
import { INTERESTS, INTEREST_LABELS, MAX_AGE, MAX_OCCUPATION_LENGTH, MIN_AGE, emptyAboutYou, parseAboutYou, type AboutYou, type Interest } from '../journey/types.ts'
import { loadAboutDraft, saveAboutDraft } from './aboutDraft.ts'
import '../onboarding/onboarding.css'
import '../profile/profile.css'
import './landing.css'

type Props = {
  initialValue: AboutYou | null
  onDone: (about: AboutYou) => void
  onSkip: () => void
  onBack?: () => void
  /** Shown in the header, e.g. "Del 1 av 3". */
  stepLabel?: string
}

/** '' = not answered yet; 'vil-ikke' = chose not to answer. Both are stored as null. */
type ChildrenChoice = '' | 'ja' | 'nei' | 'vil-ikke'

const FORM_ID = 'about-you-form'

function parseAge(text: string): number | null | 'invalid' {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  const age = Number(trimmed)
  return age >= MIN_AGE && age <= MAX_AGE ? age : 'invalid'
}

export default function AboutYouPage({ initialValue, onDone, onSkip, onBack }: Props) {
  const [initial] = useState<AboutYou>(() => loadAboutDraft() ?? parseAboutYou(initialValue) ?? emptyAboutYou())
  const [ageText, setAgeText] = useState(initial.age === null ? '' : String(initial.age))
  const [ageError, setAgeError] = useState<string | undefined>()
  const [occupation, setOccupation] = useState(initial.occupation ?? '')
  const [children, setChildren] = useState<ChildrenChoice>(initial.hasChildren === null ? '' : initial.hasChildren ? 'ja' : 'nei')
  const [interests, setInterests] = useState<Interest[]>(initial.interests)
  const ageRef = useRef<HTMLInputElement>(null)

  function current(overrides: { ageText?: string; occupation?: string; children?: ChildrenChoice; interests?: Interest[] } = {}): AboutYou {
    const age = parseAge(overrides.ageText ?? ageText)
    const choice = overrides.children ?? children
    return parseAboutYou({
      age: age === 'invalid' ? null : age,
      occupation: overrides.occupation ?? occupation,
      hasChildren: choice === 'ja' ? true : choice === 'nei' ? false : null,
      interests: overrides.interests ?? interests,
    }) ?? emptyAboutYou()
  }

  function update(overrides: Parameters<typeof current>[0]) {
    saveAboutDraft(current(overrides))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (parseAge(ageText) === 'invalid') {
      setAgeError(`Skriv alderen din som et tall mellom ${MIN_AGE} og ${MAX_AGE}, eller la feltet stå tomt.`)
      ageRef.current?.focus()
      return
    }
    onDone(current())
  }

  return (
    <Box as="main" className="onboarding" paddingInline={{ xs: 'space-16', md: 'space-32' }} paddingBlock="space-24 space-0">
      <VStack gap="space-24" className="onboarding__content">
        <VernHeader />

        <VStack gap="space-8">
          <HStack justify="space-between" align="center" wrap={false}>
            <Heading level="1" size="large">Om deg</Heading>
            <Button variant="tertiary" size="small" onClick={onSkip}>Hopp over</Button>
          </HStack>
          <BodyLong>Fortell oss litt om livet ditt, så kan vi lettere matche deg med riktig selskap.</BodyLong>
          <BodyLong textColor="subtle">Alle spørsmålene er valgfrie. Hopp over det du ikke vil svare på.</BodyLong>
        </VStack>

        <form id={FORM_ID} onSubmit={submit} noValidate>
          <VStack gap="space-32">
            <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
              <TextField
                ref={ageRef}
                className="about__field"
                label="Hvor gammel er du? (valgfritt)"
                inputMode="numeric"
                autoComplete="off"
                htmlSize={6}
                maxLength={3}
                value={ageText}
                error={ageError}
                onChange={(event) => {
                  setAgeText(event.target.value)
                  setAgeError(undefined)
                  update({ ageText: event.target.value })
                }}
              />
            </HStack>

            <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
              <TextField
                className="about__field"
                label="Hva jobber du med? (valgfritt)"
                autoComplete="organization-title"
                maxLength={MAX_OCCUPATION_LENGTH}
                value={occupation}
                onChange={(event) => {
                  setOccupation(event.target.value)
                  update({ occupation: event.target.value })
                }}
              />
            </HStack>

            <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
              <RadioGroup
                className="about__field"
                legend="Har du barn? (valgfritt)"
                value={children}
                onChange={(next: ChildrenChoice) => {
                  setChildren(next)
                  update({ children: next })
                }}
              >
                <div className="vp-q__options">
                  {([['ja', 'Ja'], ['nei', 'Nei'], ['vil-ikke', 'Vil ikke svare']] as const).map(([value, label]) => (
                    <Radio key={value} value={value} className="vp-q__option vern-choice">
                      <span className="vp-q__text">{label}</span>
                      <Check aria-hidden size={24} className="vp-q__check" />
                    </Radio>
                  ))}
                </div>
              </RadioGroup>
            </HStack>

            <HStack gap="space-8" align="start" justify="space-between" wrap={false}>
              <CheckboxGroup
                className="about__field"
                legend="Hva er du interessert i å forsikre? (valgfritt)"
                description="Velg så mange du vil."
                value={interests}
                onChange={(next: Interest[]) => {
                  const sorted = INTERESTS.filter((interest) => next.includes(interest))
                  setInterests(sorted)
                  update({ interests: sorted })
                }}
              >
                <div className="vp-q__options">
                  {INTERESTS.map((interest) => (
                    <Checkbox key={interest} value={interest} className="about__check vern-choice">
                      <span className="vp-q__text">{INTEREST_LABELS[interest]}</span>
                      <Check aria-hidden size={24} className="vp-q__check" />
                    </Checkbox>
                  ))}
                </div>
              </CheckboxGroup>
            </HStack>
          </VStack>
        </form>
      </VStack>

      <div className="cta-bar">
        <div className={onBack ? 'cta-bar__actions cta-bar__actions--stack' : 'cta-bar__actions'}>
          {onBack && <Button variant="tertiary" icon={<ArrowLeft size="1em" aria-hidden />} onClick={onBack}>Tilbake</Button>}
          <Button type="submit" form={FORM_ID} icon={<ArrowRight size="1em" aria-hidden />} iconPosition="right">Neste</Button>
        </div>
      </div>
    </Box>
  )
}
