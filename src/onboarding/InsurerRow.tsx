import type { Ref } from 'react'
import { BodyShort, Button, Detail, HStack, Tag } from '@navikt/ds-react'
import { CheckmarkIcon } from '@navikt/aksel-icons'
import Monogram from './Monogram.tsx'
import { SEGMENT_LABELS } from './insurers.ts'
import type { Insurer } from './types.ts'

type Props = {
  insurer: Insurer
  policyCount?: number
  onLogin: () => void
  buttonRef?: Ref<HTMLButtonElement>
}

export default function InsurerRow({ insurer, policyCount, onLogin, buttonRef }: Props) {
  const connected = policyCount !== undefined
  const shown = insurer.segments.slice(0, 2)
  const extra = insurer.segments.length - shown.length

  return (
    <li className="insurer-row">
      <Monogram id={insurer.id} name={insurer.name} />
      <div className="insurer-row__text">
        <BodyShort weight="semibold" className="insurer-row__name">{insurer.name}</BodyShort>
        <Detail textColor="subtle">{insurer.description}</Detail>
        <HStack gap="space-4" wrap className="insurer-row__tags">
          {connected && (
            <Tag data-color="success" variant="moderate" size="xsmall" icon={<CheckmarkIcon aria-hidden />}>
              Tilkoblet · {policyCount}
            </Tag>
          )}
          {shown.map((segment) => (
            <Tag key={segment} data-color="neutral" variant="outline" size="xsmall">{SEGMENT_LABELS[segment]}</Tag>
          ))}
          {extra > 0 && <Tag data-color="neutral" variant="outline" size="xsmall">+{extra}</Tag>}
        </HStack>
      </div>
      <Button
        ref={buttonRef}
        size="small"
        variant={connected ? 'tertiary' : 'secondary'}
        className="insurer-row__button"
        onClick={onLogin}
        aria-label={`${connected ? 'Hent på nytt fra' : 'Logg inn hos'} ${insurer.name}`}
      >
        {connected ? 'Hent på nytt' : 'Logg inn'}
      </Button>
    </li>
  )
}
