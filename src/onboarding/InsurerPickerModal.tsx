import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BodyShort, Box, Button, HStack, Modal, Search } from '@navikt/ds-react'
import { ArrowLeftIcon, CheckmarkCircleFillIcon } from '@navikt/aksel-icons'
import InsurerRow from './InsurerRow.tsx'
import MockBankIdFlow from './MockBankIdFlow.tsx'
import { policyCountLabel } from './format.ts'
import { getInsurer, searchInsurers } from './insurers.ts'
import type { ConnectionState, Policy } from './types.ts'

type View = { kind: 'list' } | { kind: 'login'; insurerId: string }

type Props = {
  open: boolean
  onClose: () => void
  connections: ConnectionState
  onConnected: (insurerId: string, policies: Policy[]) => void
}

export default function InsurerPickerModal({ open, onClose, connections, onConnected }: Props) {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [query, setQuery] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [returnFocusId, setReturnFocusId] = useState<string>()
  const flowActive = useRef(false)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())

  const results = useMemo(() => searchInsurers(query), [query])
  const loginInsurer = view.kind === 'login' ? getInsurer(view.insurerId) : undefined
  const connectedCount = Object.keys(connections).length

  useEffect(() => {
    if (view.kind === 'list' && returnFocusId) buttonRefs.current.get(returnFocusId)?.focus()
  }, [view, returnFocusId])

  function startLogin(insurerId: string) {
    setAnnouncement('')
    flowActive.current = false
    setView({ kind: 'login', insurerId })
  }

  function backToList(confirmFirst: boolean) {
    if (view.kind !== 'login') return
    if (confirmFirst && flowActive.current && !window.confirm('Vil du avbryte innloggingen?')) return
    setReturnFocusId(view.insurerId)
    setView({ kind: 'list' })
  }

  const handleActiveChange = useCallback((active: boolean) => {
    flowActive.current = active
  }, [])

  const handleConnected = useCallback((policies: Policy[]) => {
    if (view.kind !== 'login') return
    const name = getInsurer(view.insurerId)?.name ?? ''
    onConnected(view.insurerId, policies)
    setAnnouncement(`${name} tilkoblet – ${policyCountLabel(policies.length)} funnet`)
  }, [view, onConnected])

  // The native dialog can close even when onBeforeClose vetoes (e.g. repeated Esc), so always reset here.
  function handleClose() {
    flowActive.current = false
    setView({ kind: 'list' })
    setAnnouncement('')
    onClose()
  }

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
        heading: loginInsurer ? `Logg inn – ${loginInsurer.name} (demo)` : 'Velg forsikringsselskap',
        size: 'small',
        closeButton: !loginInsurer,
      }}
      width="medium"
      placement="top"
      className="insurer-sheet"
    >
      <Modal.Body className="insurer-sheet__body">
        <span className="sr-only" aria-live="polite">{announcement}</span>

        {view.kind === 'list' && (
          <>
            <div className="insurer-sheet__controls">
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
                    onLogin={() => startLogin(insurer.id)}
                    buttonRef={(node) => {
                      if (node) buttonRefs.current.set(insurer.id, node)
                      else buttonRefs.current.delete(insurer.id)
                    }}
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

        {open && loginInsurer && (
          <>
            <Button variant="tertiary" size="small" icon={<ArrowLeftIcon aria-hidden />} onClick={() => backToList(true)} className="insurer-sheet__back touch-target">
              Tilbake til listen
            </Button>
            <MockBankIdFlow
              key={loginInsurer.id}
              insurer={loginInsurer}
              onConnected={handleConnected}
              onExit={() => backToList(false)}
              onActiveChange={handleActiveChange}
            />
          </>
        )}
      </Modal.Body>

      {view.kind === 'list' && (
        <Modal.Footer className="insurer-sheet__footer">
          <Button type="button" onClick={handleClose}>
            {connectedCount ? `Ferdig (${connectedCount} tilkoblet)` : 'Lukk'}
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  )
}
