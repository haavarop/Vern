import { useEffect, useMemo, useReducer, useRef, type FormEvent } from 'react'
import { BodyLong, BodyShort, Box, Button, Detail, Heading, HStack, Label, LocalAlert, Loader, ProgressBar, Tag, TextField, VStack } from '@navikt/ds-react'
import { CheckmarkCircleFillIcon, CircleIcon, MobileIcon, PadlockLockedIcon } from '@navikt/aksel-icons'
import { initialState, maskNnin, reducer, TEST_NNIN, type FetchStage, type State } from './bankidMachine.ts'
import { insurerCountLabel, policyCountLabel } from './format.ts'
import { generatePolicies, referenceWords } from './mockPolicies.ts'
import type { ConnectionState, Insurer } from './types.ts'
import { usePrefersReducedMotion } from '../useMediaQuery.ts'

const APP_CONFIRM_MS = 2500
const APP_TIMEOUT_MS = 60_000
const FETCH_TICK_MS = 150
const FETCH_STEP = 5
/** Demo quirk: a login including `nemi` fails once mid-fetch (per open flow) to show the retry path. */
const FAILS_FIRST_FETCH = new Set(['nemi'])

const STAGES: FetchStage[] = ['connecting', 'authorising', 'fetchingPolicies', 'analysing']

const listFormat = new Intl.ListFormat('nb-NO', { type: 'conjunction' })

function stageLabel(stage: FetchStage, insurer: string): string {
  switch (stage) {
    case 'connecting': return `Kobler til ${insurer}…`
    case 'authorising': return 'Bekrefter innlogging…'
    case 'fetchingPolicies': return 'Henter forsikringer…'
    case 'analysing': return 'Sammenligner med markedet…'
  }
}

function stepTitle(state: State, insurers: string): string {
  switch (state.step) {
    case 'identify': return 'Identifiser deg'
    case 'chooseMethod': return 'Velg hvordan du vil bekrefte'
    case 'appWaiting': return 'Bekreft i appen'
    case 'codeEntry': return 'Skriv inn engangskode'
    case 'consent': return 'Gi samtykke'
    case 'fetching': return 'Henter forsikringene dine'
    case 'done': return state.policies.length ? `Fant ${policyCountLabel(state.policies.length)}` : `Ingen forsikringer funnet hos ${insurers}`
    case 'failed': return 'Innloggingen ble ikke fullført'
  }
}

const isMidFlow = (state: State) => !['identify', 'done', 'failed'].includes(state.step)

type Props = {
  insurers: Insurer[]
  onConnected: (results: ConnectionState) => void
  onExit: () => void
  onActiveChange: (active: boolean) => void
}

export default function MockBankIdFlow({ insurers, onConnected, onExit, onActiveChange }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState())
  const headingRef = useRef<HTMLHeadingElement>(null)
  const failedOnce = useRef(false)
  const reducedMotion = usePrefersReducedMotion()
  const progress = state.step === 'fetching' ? state.progress : -1
  const active = isMidFlow(state)
  const insurerIds = useMemo(() => insurers.map((insurer) => insurer.id), [insurers])
  const names = insurers.length <= 3 ? listFormat.format(insurers.map((insurer) => insurer.name)) : `${insurers.length} valgte selskaper`
  const shortLabel = insurers.length === 1 ? insurers[0].name : insurerCountLabel(insurers.length)

  useEffect(() => {
    headingRef.current?.focus()
  }, [state.step])

  useEffect(() => {
    onActiveChange(active)
  }, [active, onActiveChange])

  useEffect(() => {
    if (state.step !== 'appWaiting') return
    const confirm = setTimeout(() => dispatch({ type: 'APP_CONFIRMED' }), APP_CONFIRM_MS)
    const timeout = setTimeout(() => dispatch({ type: 'APP_TIMEOUT' }), APP_TIMEOUT_MS)
    return () => {
      clearTimeout(confirm)
      clearTimeout(timeout)
    }
  }, [state.step])

  useEffect(() => {
    if (progress < 0) return
    if (progress >= 60 && insurerIds.some((id) => FAILS_FIRST_FETCH.has(id)) && !failedOnce.current) {
      failedOnce.current = true
      dispatch({ type: 'FETCH_ERROR' })
      return
    }
    if (progress >= 100) {
      const results: ConnectionState = Object.fromEntries(insurerIds.map((id) => [id, generatePolicies(id)]))
      dispatch({ type: 'FETCH_DONE', policies: Object.values(results).flat() })
      onConnected(results)
      return
    }
    const tick = setTimeout(() => dispatch({ type: 'FETCH_PROGRESS', progress: progress + FETCH_STEP }), reducedMotion ? FETCH_TICK_MS / 4 : FETCH_TICK_MS)
    return () => clearTimeout(tick)
  }, [progress, insurerIds, onConnected, reducedMotion])

  function submit(event: FormEvent<HTMLFormElement>, type: 'SUBMIT_NNIN' | 'SUBMIT_CODE') {
    event.preventDefault()
    dispatch({ type })
  }

  const cancel = <Button type="button" variant="tertiary" onClick={onExit}>Avbryt</Button>

  return (
    <div className="eid">
      <Box background="neutral-strong" className="eid__strip" paddingInline="space-16" paddingBlock="space-12">
        <HStack gap="space-8" align="center" wrap={false}>
          <PadlockLockedIcon aria-hidden fontSize="1.25rem" />
          <BodyShort weight="semibold">Sikker innlogging (demo)</BodyShort>
          <BodyShort size="small" className="eid__strip-insurer">{shortLabel}</BodyShort>
        </HStack>
      </Box>

      <VStack gap="space-16" className="eid__body">
        <div>
          <Tag data-color="warning" variant="moderate" size="small">Demo – simulert innlogging</Tag>
        </div>
        <Heading ref={headingRef} tabIndex={-1} level="3" size="small" className="eid__heading">
          {stepTitle(state, names)}
        </Heading>

        {state.step === 'identify' && (
          <form onSubmit={(event) => submit(event, 'SUBMIT_NNIN')}>
            <VStack gap="space-16">
              <BodyShort textColor="subtle">
                BankID-lignende innlogging (simulert) hos {names}.{insurers.length > 1 && ' Én innlogging gjelder for alle valgte selskaper.'}
              </BodyShort>
              <TextField
                label="Fødselsnummer (11 siffer)"
                description="Dette er en demo. Ikke skriv inn ditt ekte fødselsnummer."
                inputMode="numeric"
                autoComplete="off"
                maxLength={11}
                value={state.nnin}
                error={state.error}
                onChange={(event) => dispatch({ type: 'SET_NNIN', value: event.target.value })}
              />
              <div>
                <Button type="button" variant="tertiary" size="small" className="touch-target" onClick={() => dispatch({ type: 'SET_NNIN', value: TEST_NNIN })}>
                  Bruk testnummer
                </Button>
              </div>
              <HStack gap="space-8">
                <Button type="submit">Neste</Button>
                {cancel}
              </HStack>
            </VStack>
          </form>
        )}

        {state.step === 'chooseMethod' && (
          <VStack gap="space-12">
            <BodyShort textColor="subtle">Fødselsnummer: {maskNnin(state.nnin)}</BodyShort>
            <Button variant="secondary" className="eid__choice" icon={<MobileIcon aria-hidden />}
              onClick={() => dispatch({ type: 'CHOOSE_METHOD', method: 'app', reference: referenceWords(insurerIds.join(',')) })}>
              Bekreft i app (simulert)
            </Button>
            <Button variant="secondary" className="eid__choice" icon={<PadlockLockedIcon aria-hidden />}
              onClick={() => dispatch({ type: 'CHOOSE_METHOD', method: 'code' })}>
              Engangskode (simulert)
            </Button>
            <div>{cancel}</div>
          </VStack>
        )}

        {state.step === 'appWaiting' && (
          <VStack gap="space-16">
            <Box background="sunken" borderRadius="12" padding="space-16">
              <HStack gap="space-16" align="center" wrap={false}>
                <MobileIcon aria-hidden fontSize="2.5rem" />
                <VStack gap="space-4">
                  <Detail textColor="subtle">Referanse</Detail>
                  <span className="eid__reference">{state.reference}</span>
                </VStack>
                <Loader size="medium" title="Venter på bekreftelse" className="eid__loader" />
              </HStack>
            </Box>
            <BodyShort>Åpne appen og bekreft at referansen stemmer (simulert).</BodyShort>
            <HStack gap="space-8">
              <Button onClick={() => dispatch({ type: 'APP_CONFIRMED' })}>Simuler bekreftelse nå</Button>
              {cancel}
            </HStack>
          </VStack>
        )}

        {state.step === 'codeEntry' && (
          <form onSubmit={(event) => submit(event, 'SUBMIT_CODE')}>
            <VStack gap="space-16">
              <TextField
                label="Engangskode"
                description="Demo: skriv hvilken som helst 6-sifret kode. 000000 gir feil."
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                htmlSize={10}
                value={state.code}
                error={state.error}
                onChange={(event) => dispatch({ type: 'SET_CODE', value: event.target.value })}
              />
              <HStack gap="space-8">
                <Button type="submit">Bekreft</Button>
                {cancel}
              </HStack>
            </VStack>
          </form>
        )}

        {state.step === 'consent' && (
          <VStack gap="space-16">
            <BodyLong>
              Vern vil hente oversikt over forsikringene dine hos {names}: produkt, dekning, pris og fornyelsesdato.
            </BodyLong>
            <HStack gap="space-8">
              <Button onClick={() => dispatch({ type: 'ACCEPT_CONSENT' })}>Godta og hent</Button>
              {cancel}
            </HStack>
          </VStack>
        )}

        {state.step === 'fetching' && (
          <VStack gap="space-16">
            <Label as="p" id="eid-stage" size="small">{stageLabel(state.stage, shortLabel)}</Label>
            <ProgressBar value={state.progress} valueMax={100} aria-labelledby="eid-stage" />
            <ul className="eid__stages">
              {STAGES.map((stage, index) => {
                const current = STAGES.indexOf(state.stage)
                return (
                  <li key={stage} className={index > current ? 'eid__stage eid__stage--pending' : 'eid__stage'}>
                    {index < current ? <CheckmarkCircleFillIcon aria-hidden className="eid__stage-done" />
                      : index === current ? <Loader size="xsmall" title="Pågår" />
                        : <CircleIcon aria-hidden />}
                    <BodyShort size="small">{stageLabel(stage, shortLabel)}</BodyShort>
                  </li>
                )
              })}
            </ul>
            <span className="sr-only" aria-live="polite">{stageLabel(state.stage, shortLabel)}</span>
          </VStack>
        )}

        {state.step === 'done' && (
          <VStack gap="space-16">
            {state.policies.length === 0 ? (
              <BodyShort textColor="subtle">
                Vi fant ingen aktive avtaler. {insurers.length === 1 ? 'Selskapet er' : 'Selskapene er'} likevel markert som tilkoblet.
              </BodyShort>
            ) : insurers.length === 1 ? (
              <ul className="eid__found">
                {state.policies.map((policy) => (
                  <li key={policy.id}>
                    <CheckmarkCircleFillIcon aria-hidden className="eid__stage-done" />
                    <BodyShort size="small">{policy.product}</BodyShort>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="eid__found">
                {insurers.map((insurer) => {
                  const count = state.policies.filter((policy) => policy.insurerId === insurer.id).length
                  return (
                    <li key={insurer.id}>
                      <CheckmarkCircleFillIcon aria-hidden className="eid__stage-done" />
                      <BodyShort size="small">
                        <strong>{insurer.name}</strong> – {count ? policyCountLabel(count) : 'ingen forsikringer'}
                      </BodyShort>
                    </li>
                  )
                })}
              </ul>
            )}
            <div><Button onClick={onExit}>Tilbake til listen</Button></div>
          </VStack>
        )}

        {state.step === 'failed' && (
          <VStack gap="space-16">
            <LocalAlert status="error" size="small">
              <LocalAlert.Header>
                <LocalAlert.Title as="h4">Noe gikk galt</LocalAlert.Title>
              </LocalAlert.Header>
              <LocalAlert.Content>{state.message}</LocalAlert.Content>
            </LocalAlert>
            <HStack gap="space-8">
              <Button onClick={() => dispatch({ type: 'RETRY' })}>Prøv igjen</Button>
              <Button variant="tertiary" onClick={onExit}>Tilbake til listen</Button>
            </HStack>
          </VStack>
        )}
      </VStack>

      <Detail textColor="subtle" className="eid__footer">
        Ingen ekte innlogging skjer. Vern bruker ikke BankID i denne demoen.
      </Detail>
    </div>
  )
}
