import { BodyShort, Box, Button, Detail, ExpansionCard, HGrid, HStack, Tag, VStack } from '@navikt/ds-react'
import { BankNoteIcon, Buildings2Icon, FileTextIcon, ShieldIcon, TrashIcon } from '@navikt/aksel-icons'
import { getInsurer } from './insurers.ts'
import { formatKr, sumPremium } from './format.ts'
import { DonutChart } from './charts.tsx'
import { CHART_COLORS } from './chartColors.ts'
import type { ConnectionState, Policy } from './types.ts'

const date = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? date.format(new Date(value)) : '–')
const compactKr = new Intl.NumberFormat('nb-NO', { notation: 'compact', maximumFractionDigits: 1 })
const shortKr = (value: number) => (value >= 100_000 ? `${compactKr.format(value)} kr` : formatKr(value))

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Box background="sunken" borderRadius="12" padding="space-12">
      <HStack gap="space-8" align="center" wrap={false}>
        <span className="stat__icon" aria-hidden>{icon}</span>
        <div>
          <Detail textColor="subtle">{label}</Detail>
          <BodyShort size="large" weight="semibold">{value}</BodyShort>
        </div>
      </HStack>
    </Box>
  )
}

function KeyFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-figure">
      <Detail textColor="subtle">{label}</Detail>
      <BodyShort weight="semibold" size="large">{value}</BodyShort>
    </div>
  )
}

function PolicyCard({ policy, color, onRemove }: { policy: Policy; color: string; onRemove?: () => void }) {
  const lines = policy.coverages ?? []

  return (
    <li className="policy-card" style={{ '--policy-color': color } as React.CSSProperties}>
      <HStack justify="space-between" align="center" gap="space-8" wrap={false}>
        <BodyShort weight="semibold">{policy.product}</BodyShort>
        {onRemove && <Button variant="tertiary-neutral" size="small" icon={<TrashIcon title={`Fjern ${policy.product}`} />} onClick={onRemove} />}
      </HStack>

      <HGrid columns={3} gap="space-8" className="policy-card__figures">
        <KeyFigure label="Per måned" value={policy.premium ? formatKr(policy.premium) : '–'} />
        <KeyFigure label="Egenandel" value={policy.deductible !== undefined ? formatKr(policy.deductible) : '–'} />
        <KeyFigure label="Forsikringssum" value={policy.sumInsured !== undefined ? shortKr(policy.sumInsured) : '–'} />
      </HGrid>

      {lines.length > 0 && (
        <VStack gap="space-4">
          <HStack justify="space-between" className="coverage-list__head" aria-hidden>
            <Detail textColor="subtle">Dekning</Detail>
            <HStack gap="space-16" wrap={false}>
              <Detail textColor="subtle" className="coverage-list__col">Dekkes inntil</Detail>
              <Detail textColor="subtle" className="coverage-list__col">Egenandel</Detail>
            </HStack>
          </HStack>
          <ul className="coverage-list" aria-label={`Dekninger for ${policy.product}`}>
            {lines.map((line, index) => (
              <li key={index}>
                <BodyShort size="small">{line.name}</BodyShort>
                <HStack gap="space-16" wrap={false}>
                  <BodyShort size="small" weight="semibold" className="coverage-list__col">
                    <span className="sr-only">Dekkes inntil </span>{line.sumInsured !== undefined ? formatKr(line.sumInsured) : '–'}
                  </BodyShort>
                  <BodyShort size="small" className="coverage-list__col">
                    <span className="sr-only">Egenandel </span>{line.deductible !== undefined ? formatKr(line.deductible) : line.note ?? '–'}
                  </BodyShort>
                </HStack>
              </li>
            ))}
          </ul>
        </VStack>
      )}

      {(policy.exclusions?.length || policy.notes?.length) ? (
        <ExpansionCard size="small" aria-label={`Vilkår for ${policy.product}`} className="policy-card__terms">
          <ExpansionCard.Header>
            <ExpansionCard.Title as="h4" size="small">Vilkår i korte trekk</ExpansionCard.Title>
          </ExpansionCard.Header>
          <ExpansionCard.Content>
            <VStack gap="space-12">
              {policy.exclusions && policy.exclusions.length > 0 && (
                <VStack gap="space-4">
                  <Detail weight="semibold">Dekkes ikke</Detail>
                  <HStack gap="space-4" wrap>{policy.exclusions.map((item) => <Tag key={item} size="xsmall" variant="error-moderate">{item}</Tag>)}</HStack>
                </VStack>
              )}
              {policy.notes && policy.notes.length > 0 && (
                <VStack gap="space-4">
                  <Detail weight="semibold">Verdt å vite</Detail>
                  <HStack gap="space-4" wrap>{policy.notes.map((item) => <Tag key={item} size="xsmall" variant="info-moderate">{item}</Tag>)}</HStack>
                </VStack>
              )}
            </VStack>
          </ExpansionCard.Content>
        </ExpansionCard>
      ) : null}

      <HStack gap="space-4" wrap>
        <Tag size="xsmall" variant="neutral">Fornyes {formatDate(policy.renewalDate)}</Tag>
        {policy.source?.type === 'document' && <Tag size="xsmall" variant="neutral" icon={<FileTextIcon aria-hidden />}>{policy.source.fileName}</Tag>}
      </HStack>
    </li>
  )
}

type Props = {
  connections: ConnectionState
  /** Shows a remove button per policy. */
  onRemovePolicy?: (policy: Policy) => void
}

export default function PolicySummary({ connections, onRemovePolicy }: Props) {
  const entries = Object.entries(connections)
  const all = entries.flatMap(([, policies]) => policies)
  const monthly = sumPremium(all)
  const colorOf = new Map(all.map((policy, i) => [policy.id, CHART_COLORS[i % CHART_COLORS.length]]))

  return (
    <VStack gap="space-16" as="section" aria-label="Oppsummering av forsikringer">
      <HGrid columns={{ xs: 1, sm: 3 }} gap="space-12">
        <Stat icon={<BankNoteIcon />} label="Per måned" value={formatKr(monthly)} />
        <Stat icon={<ShieldIcon />} label="Forsikringer" value={String(all.length)} />
        <Stat icon={<Buildings2Icon />} label="Selskaper" value={String(entries.length)} />
      </HGrid>

      {all.length > 1 && monthly > 0 && (
        <Box background="raised" borderRadius="12" padding="space-16" borderWidth="1" borderColor="neutral-subtle">
          <HStack gap="space-24" align="center" wrap>
            <DonutChart slices={all.map((p) => ({ label: p.product, value: p.premium }))} centerValue={formatKr(monthly * 12)} centerLabel="per år" />
            <VStack as="ul" gap="space-8" className="chart-legend" aria-label="Fordeling av pris">
              {all.map((policy) => (
                <li key={policy.id}>
                  <span className="chart-legend__dot" style={{ background: colorOf.get(policy.id) }} aria-hidden />
                  <BodyShort size="small">{policy.product}</BodyShort>
                  <BodyShort size="small" weight="semibold">{Math.round((policy.premium / monthly) * 100)} %</BodyShort>
                </li>
              ))}
            </VStack>
          </HStack>
        </Box>
      )}

      {entries.map(([insurerId, policies]) => (
        <VStack key={insurerId} gap="space-8">
          <Detail weight="semibold" textColor="subtle" className="insurer-label">{getInsurer(insurerId)?.name ?? policies[0]?.insurer ?? insurerId}</Detail>
          <VStack as="ul" gap="space-12" className="policy-list">
            {policies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} color={colorOf.get(policy.id) ?? CHART_COLORS[0]}
                onRemove={onRemovePolicy ? () => onRemovePolicy(policy) : undefined} />
            ))}
          </VStack>
        </VStack>
      ))}
    </VStack>
  )
}
