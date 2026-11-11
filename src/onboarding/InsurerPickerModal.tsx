import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BodyShort, Box, Button, Checkbox, HStack, Modal, Search } from '@navikt/ds-react'
import { ArrowLeftIcon, CheckmarkCircleFillIcon } from '@navikt/aksel-icons'
import InsurerRow from './InsurerRow.tsx'
import MockBankIdFlow from './MockBankIdFlow.tsx'
import { insurerCountLabel, policyCountLabel } from './format.ts'
import { getInsurer, searchInsurers } from './insurers.ts'
import type { ConnectionState, Insurer } from './types.ts'

type View = { kind: 'list' } | { kind: 'login'; insurerIds: string[] }

type Props = {
  open: boolean
  onClose: () => void
  connections: ConnectionState
  onConnected: (results: ConnectionState) => void
}

export default function InsurerPickerModal({ open, onClose, connections, onConnected }: Props) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [announcement, setAnnouncement] = useState('')
  const flowActive = useRef(false)
  const loginButtonRef = useRef<HTMLButtonElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef(false)

  const results = useMemo(() => searchInsurers(query), [query])
  const loginInsurers = useMemo(
    () => (view.kind === 'login' ? view.insurerIds.map(getInsurer).filter((insurer): insurer is Insurer => !!insurer) : []),
    [view],
  )
  const connectedCount = Object.keys(connections).length
  const selectedInResults = results.filter((insurer) => selected.has(insurer.id)).length
  const allResultsSelected = results.length > 0 && selectedInResults === results.length

  function toggle(insurerId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(insurerId)
      else next.delete(insurerId)
      return next
    })
  }

  function toggleAllResults() {
    setSelected((current) => {
      const next = new Set(current)
      for (const insurer of results) {
        if (allResultsSelected) next.delete(insurer.id)
        else next.add(insurer.id)
      }
      return next
    })
  }

  function startLogin() {
    if (selected.size === 0) return
    setAnnouncement('')
    flowActive.current = false
    setView({ kind: 'login', insurerIds: [...selected] })
  }

  function backToList(confirmFirst: boolean) {
    if (view.kind !== 'login') return
    if (confirmFirst && flowActive.current && !window.confirm('Vil du avbryte innloggingen?')) return
    returnFocus.current = true
    setView({ kind: 'list' })
  }

  useEffect(() => {
    if (view.kind !== 'list' || !returnFocus.current) return
    returnFocus.current = false
    const button = loginButtonRef.current
    ;(button && !button.disabled ? button : controlsRef.current?.querySelector('input'))?.focus()
  }, [view])

  const handleActiveChange = useCallback((active: boolean) => {
    flowActive.current = active
  }, [])

  const handleConnected = useCallback((connected: ConnectionState) => {
    const insurerCount = Object.keys(connected).length
    const policyCount = Object.values(connected).flat().length
    onConnected(connected)
    setSelected(new Set())
    setAnnouncement(`${insurerCountLabel(insurerCount)} tilkoblet – ${policyCountLabel(policyCount)} funnet`)
  }, [onConnected])

  // The native dialog can close even when onBeforeClose vetoes (e.g. repeated Esc), so always reset here.
  function handleClose() {
    flowActive.current = false
    setView({ kind: 'list' })
    setAnnouncement('')
    onClose()
  }

  const loginHeading = loginInsurers.length === 1 ? loginInsurers[0].name : insurerCountLabel(loginInsurers.length)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      onBeforeClose={() => {
        if (view.kind === 'list') return true
        backToList(true)
        return false
      }}
      header={{
        heading: view.kind === 'login' ? `Logg inn – ${loginHeading} (demo)` : 'Velg forsikringsselskaper',
        size: 'small',
        closeButton: view.kind === 'list',
      }}
      width="medium"
      placement="top"
      className="insurer-sheet"
    >
      <Modal.Body className="insurer-sheet__body">
        <span className="sr-only" aria-live="polite">{announcement}</span>

        {view.kind === 'list' && (
          <>
            <div ref={controlsRef} className="insurer-sheet__controls">
              <Search
                label="Søk etter selskap"
                variant="simple"
                size="small"
                value={query}
                onChange={setQuery}
                onClear={() => setQuery('')}
                clearButtonLabel="Tøm søk"
                autoComplete="off"
                placeholder="Søk etter selskap eller bank"
              />
              {results.length > 0 && (
                <Checkbox
                  size="small"
                  checked={allResultsSelected}
                  indeterminate={selectedInResults > 0 && !allResultsSelected}
                  onChange={toggleAllResults}
                >
                  {query ? `Velg alle treff (${results.length})` : `Velg alle (${results.length})`}
                </Checkbox>
              )}
              <span className="sr-only" role="status">{results.length} selskaper</span>
            </div>

            {announcement && (
              <Box background="success-soft" borderRadius="8" padding="space-12" className="insurer-sheet__notice">
                <HStack gap="space-8" align="center" wrap={false}>
                  <CheckmarkCircleFillIcon aria-hidden className="insurer-sheet__notice-icon" />
                  <BodyShort size="small">{announcement}</BodyShort>
                </HStack>
              </Box>
            )}

            {results.length > 0 ? (
              <ul role="list" className="insurer-list">
                {results.map((insurer) => (
                  <InsurerRow
                    key={insurer.id}
                    insurer={insurer}
                    policyCount={connections[insurer.id]?.length}
                    selected={selected.has(insurer.id)}
                    onToggle={(checked) => toggle(insurer.id, checked)}
                  />
                ))}
              </ul>
            ) : (
              <BodyShort className="insurer-list__empty" textColor="subtle">
                Ingen selskaper matcher «{query}»
              </BodyShort>
            )}
          </>
        )}

        {open && view.kind === 'login' && (
          <>
            <Button variant="tertiary" size="small" icon={<ArrowLeftIcon aria-hidden />} onClick={() => backToList(true)} className="insurer-sheet__back touch-target">
              Tilbake til listen
            </Button>
            <MockBankIdFlow
              insurers={loginInsurers}
              onConnected={handleConnected}
              onExit={() => backToList(false)}
              onActiveChange={handleActiveChange}
            />
          </>
        )}
      </Modal.Body>

      {view.kind === 'list' && (
        <Modal.Footer className="insurer-sheet__footer">
          <Button ref={loginButtonRef} type="button" disabled={selected.size === 0} onClick={startLogin}>
            {selected.size ? `Logg inn (${selected.size})` : 'Logg inn'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            {connectedCount ? `Ferdig (${connectedCount} tilkoblet)` : 'Lukk'}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  )
}
