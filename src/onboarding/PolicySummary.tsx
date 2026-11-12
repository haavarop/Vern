import { BodyShort, Button, Detail, ExpansionCard, HGrid, HStack, Tag, VStack } from '@navikt/ds-react'
import { Banknote, Building2, ChevronDown, FileText, Shield, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { getInsurer } from './insurers.ts'
import Monogram from './Monogram.tsx'
import { formatKr, sumPremium } from './format.ts'
import { DonutChart } from './charts.tsx'
import { CHART_COLORS, groupForChart } from './chartColors.ts'
import type { ConnectionState, Policy } from './types.ts'

const date = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? date.format(new Date(value)) : '–')
const compactKr = new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 })
const shortKr = (value: number) => (value >= 100_000 ? `${compactKr.format(value)}\u00a0kr` : formatKr(value))

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="stat">
      <HStack gap="space-12" align="center" wrap={false}>
        <span className="stat__icon" aria-hidden>{icon}</span>
        <div>
          <Detail textColor="subtle">{label}</Detail>
          <p className="vern-h2 stat__value">{value}</p>
        </div>
      </HStack>
    </div>
  )
}

function KeyFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-figure">
      <Detail textColor="subtle">{label}</Detail>
      <BodyShort weight="semibold">{value}</BodyShort>
    </div>
  )
}

function PolicyCard({ policy, color, onRemove, collapsible }: { policy: Policy; color: string; onRemove?: () => void; collapsible?: boolean }) {
  const lines = policy.coverages ?? []
  const [open, setOpen] = useState(!collapsible)
  const detailsId = useId()

  return (
    <li className="policy-card">
      <HStack justify="space-between" align="center" gap="space-8" wrap={false}>
        <HStack gap="space-8" align="center" wrap={false}>
          <span className="chart-legend__dot" style={{ background: color }} aria-hidden />
          <BodyShort weight="semibold">{policy.product}</BodyShort>
        </HStack>
        <HStack gap="space-8" align="center" wrap={false}>
          {collapsible && !open && policy.premium ? <BodyShort weight="semibold" className="policy-card__price">{formatKr(policy.premium)}<Detail as="span" textColor="subtle">/mnd</Detail></BodyShort> : null}
          {onRemove && <Button variant="tertiary" size="small" icon={<Trash2 size="1em" aria-hidden />} aria-label={`Fjern ${policy.product}`} onClick={onRemove} />}
        </HStack>
      </HStack>

      {open && (
      <div id={detailsId} className="policy-card__details">
      <HGrid columns={{ xs: 1, sm: 3 }} gap="space-8" className="policy-card__figures">
        <KeyFigure label="Per måned" value={policy.premium ? formatKr(policy.premium) : '–'} />
        <KeyFigure label="Du betaler selv" value={policy.deductible !== undefined ? formatKr(policy.deductible) : '–'} />
        <KeyFigure label="Dekker inntil" value={policy.sumInsured !== undefined ? shortKr(policy.sumInsured) : '–'} />
      </HGrid>
      {policy.deductible !== undefined && (
        <Detail textColor="subtle">«Du betaler selv» er egenandelen: den delen du betaler ved en skade før forsikringen tar resten.</Detail>
      )}

      {lines.length > 0 && (
        <div className="coverage-table">
          <div className="coverage-table__row coverage-table__head" aria-hidden>
            <Detail textColor="subtle">Hva som dekkes</Detail>
            <Detail textColor="subtle" className="coverage-table__num">Inntil</Detail>
            <Detail textColor="subtle" className="coverage-table__num">Du betaler selv</Detail>
          </div>
          <ul className="coverage-table__body" aria-label={`Dette dekker ${policy.product}`}>
            {lines.map((line, index) => (
              <li key={index} className="coverage-table__row">
                <BodyShort size="small">{line.name}</BodyShort>
                <BodyShort size="small" weight="semibold" className="coverage-table__num">
                  <span className="sr-only">Dekkes inntil </span>{line.sumInsured !== undefined ? formatKr(line.sumInsured) : '–'}
                </BodyShort>
                <BodyShort size="small" className="coverage-table__num">
                  <span className="sr-only">Du betaler selv </span>{line.deductible !== undefined ? formatKr(line.deductible) : line.note ?? '–'}
                </BodyShort>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(policy.exclusions?.length || policy.notes?.length) ? (
        <ExpansionCard size="small" aria-label={`Verdt å vite om ${policy.product}`} className="policy-card__terms">
          <ExpansionCard.Header>
            <ExpansionCard.Title as="h4" size="small">Verdt å vite om forsikringen</ExpansionCard.Title>
          </ExpansionCard.Header>
          <ExpansionCard.Content>
            <VStack gap="space-12">
              {policy.exclusions && policy.exclusions.length > 0 && (
                <VStack gap="space-4">
                  <Detail weight="semibold">Dette dekkes ikke</Detail>
                  <HStack gap="space-4" wrap>{policy.exclusions.map((item) => <Tag key={item} size="xsmall" variant="neutral">{item}</Tag>)}</HStack>
                </VStack>
              )}
              {policy.notes && policy.notes.length > 0 && (
                <VStack gap="space-4">
                  <Detail weight="semibold">Verdt å vite</Detail>
                  <HStack gap="space-4" wrap>{policy.notes.map((item) => <Tag key={item} size="xsmall" variant="neutral">{item}</Tag>)}</HStack>
                </VStack>
              )}
            </VStack>
          </ExpansionCard.Content>
        </ExpansionCard>
      ) : null}

      <HStack gap="space-4" wrap>
        <Tag size="xsmall" variant="neutral">Fornyes {formatDate(policy.renewalDate)}</Tag>
        {policy.source?.type === 'document' && <Tag size="xsmall" variant="neutral" icon={<FileText size="1em" aria-hidden />}>{policy.source.fileName}</Tag>}
      </HStack>
      </div>
      )}

      {collapsible && (
        <div>
          <Button variant="tertiary" size="small" aria-expanded={open} aria-controls={open ? detailsId : undefined}
            icon={<ChevronDown size="1em" aria-hidden className={open ? 'policy-card__chevron is-open' : 'policy-card__chevron'} />}
            iconPosition="right" onClick={() => setOpen((value) => !value)}>
            {open ? 'Skjul detaljer' : 'Vis detaljer'}
          </Button>
        </div>
      )}
    </li>
  )
}

const insurerName = (insurerId: string, policies: Policy[]) => getInsurer(insurerId)?.name ?? policies[0]?.insurer ?? insurerId

type Props = {
  connections: ConnectionState
  /** Shows a remove button per policy. */
  onRemovePolicy?: (policy: Policy) => void
  /** Starts each policy collapsed behind a «Vis detaljer» toggle and shows insurer logos. */
  collapsible?: boolean
}

export default function PolicySummary({ connections, onRemovePolicy, collapsible }: Props) {
  const entries = Object.entries(connections)
  const all = entries.flatMap(([, policies]) => policies)
  const monthly = sumPremium(all)
  const groups = groupForChart(all.map((policy) => ({ id: policy.id, label: policy.product, value: policy.premium })))
  const colorOf = new Map(groups.flatMap((group) => group.ids.map((id) => [id, group.color] as const)))

  return (
    <VStack gap="space-16" as="section" aria-label="Forsikringene dine samlet">
      <HGrid columns={{ xs: 1, sm: 3 }} gap="space-12">
        <Stat icon={<Banknote size="1em" />} label="Du betaler per måned" value={formatKr(monthly)} />
        <Stat icon={<Shield size="1em" />} label="Forsikringer" value={String(all.length)} />
        <Stat icon={<Building2 size="1em" />} label="Selskaper" value={String(entries.length)} />
      </HGrid>

      {all.length > 1 && monthly > 0 && (
        <div className="vern-card">
          <HStack gap="space-24" align="center" wrap>
            <DonutChart slices={groups} centerValue={formatKr(monthly * 12)} centerLabel="per år" />
            <VStack as="ul" gap="space-8" className="chart-legend" aria-label="Hvor mye hver forsikring utgjør av prisen">
              {groups.map((group) => (
                <li key={group.ids.join()}>
                  <span className="chart-legend__dot" style={{ background: group.color }} aria-hidden />
                  <BodyShort size="small">{group.label}</BodyShort>
                  <BodyShort size="small" weight="semibold">{Math.round((group.value / monthly) * 100)}{'\u00a0'}%</BodyShort>
                </li>
              ))}
            </VStack>
          </HStack>
        </div>
      )}

      {entries.map(([insurerId, policies]) => (
        <VStack key={insurerId} gap="space-8">
          {collapsible ? (
            <HStack gap="space-8" align="center" wrap={false}>
              <Monogram id={insurerId} name={insurerName(insurerId, policies)} size="small" />
              <BodyShort weight="semibold" className="insurer-label">{insurerName(insurerId, policies)}</BodyShort>
            </HStack>
          ) : (
            <Detail weight="semibold" className="insurer-label">{insurerName(insurerId, policies)}</Detail>
          )}
          <VStack as="ul" gap="space-12" className="policy-list">
            {policies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} color={colorOf.get(policy.id) ?? CHART_COLORS[0]}
                onRemove={onRemovePolicy ? () => onRemovePolicy(policy) : undefined} collapsible={collapsible} />
            ))}
          </VStack>
        </VStack>
      ))}
    </VStack>
  )
}
