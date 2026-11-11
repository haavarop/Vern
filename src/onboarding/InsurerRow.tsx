import { BodyShort, Detail, HStack, Tag } from '@navikt/ds-react'
import { CheckmarkIcon } from '@navikt/aksel-icons'
import Monogram from './Monogram.tsx'
import { SEGMENT_LABELS } from './insurers.ts'
import type { Insurer } from './types.ts'

type Props = {
  insurer: Insurer
  policyCount?: number
  selected: boolean
  onToggle: (selected: boolean) => void
}

export default function InsurerRow({ insurer, policyCount, selected, onToggle }: Props) {
  const connected = policyCount !== undefined
  const shown = insurer.segments.slice(0, 2)
  const extra = insurer.segments.length - shown.length
  const nameId = `insurer-${insurer.id}-name`
  const detailId = `insurer-${insurer.id}-detail`
  const statusId = `insurer-${insurer.id}-status`

  return (
    <li>
      <label className={selected ? 'insurer-row insurer-row--selected' : 'insurer-row'}>
        <Monogram id={insurer.id} name={insurer.name} />
        <div className="insurer-row__text">
          <BodyShort id={nameId} weight="semibold" className="insurer-row__name">{insurer.name}</BodyShort>
          <Detail id={detailId} textColor="subtle">{insurer.description}</Detail>
          <HStack gap="space-4" wrap className="insurer-row__tags">
            {connected && (
              <Tag id={statusId} data-color="success" variant="moderate" size="xsmall" icon={<CheckmarkIcon aria-hidden />}>
                Tilkoblet · {policyCount}
              </Tag>
            )}
            {shown.map((segment) => (
              <Tag key={segment} data-color="neutral" variant="outline" size="xsmall">{SEGMENT_LABELS[segment]}</Tag>
            ))}
            {extra > 0 && <Tag data-color="neutral" variant="outline" size="xsmall">+{extra}</Tag>}
          </HStack>
        </div>
        <input
          type="checkbox"
          className="insurer-row__checkbox"
          checked={selected}
          onChange={(event) => onToggle(event.target.checked)}
          aria-labelledby={nameId}
          aria-describedby={connected ? `${statusId} ${detailId}` : detailId}
        />
      </label>
    </li>
  )
}
