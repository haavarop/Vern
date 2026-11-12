import { BodyShort, Box, Button, Detail, ExpansionCard, HGrid, HStack, List, ReadMore, Table, VStack } from '@navikt/ds-react'
import { getInsurer } from './insurers.ts'
import { formatKr, policyCountLabel, sumPremium } from './format.ts'
import type { ConnectionState, Policy } from './types.ts'

const date = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

const formatDate = (value?: string) => (value && !Number.isNaN(Date.parse(value)) ? date.format(new Date(value)) : '–')

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box background="sunken" borderRadius="12" padding="space-12">
      <Detail textColor="subtle">{label}</Detail>
      <BodyShort size="large" weight="semibold">{value}</BodyShort>
    </Box>
  )
}

function PolicyDetails({ policy }: { policy: Policy }) {
  const facts = [
    policy.annualPremium !== undefined && `${formatKr(policy.annualPremium)}/år`,
    policy.sumInsured !== undefined && `Forsikringssum ${formatKr(policy.sumInsured)}`,
    `Fornyes ${formatDate(policy.renewalDate)}`,
    policy.policyNumber && `Nr. ${policy.policyNumber}`,
  ].filter(Boolean).join(' · ')

  return (
    <VStack gap="space-8" className="policy-details">
      <Detail textColor="subtle">{facts}</Detail>
      {policy.coverages && policy.coverages.length > 0 && (
        <Table size="small" aria-label={`Dekninger for ${policy.product}`}>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Dekning</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">Sum</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">Egenandel</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {policy.coverages.map((line, index) => (
              <Table.Row key={index}>
                <Table.DataCell>{line.name}</Table.DataCell>
                <Table.DataCell align="right">{line.sumInsured !== undefined ? formatKr(line.sumInsured) : '–'}</Table.DataCell>
                <Table.DataCell align="right">{line.deductible !== undefined ? formatKr(line.deductible) : line.note ?? '–'}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      {policy.exclusions && policy.exclusions.length > 0 && (
        <ReadMore header="Dekkes ikke" size="small">
          <List as="ul" size="small">{policy.exclusions.map((item, index) => <List.Item key={index}>{item}</List.Item>)}</List>
        </ReadMore>
      )}
      {policy.notes && policy.notes.length > 0 && (
        <ReadMore header="Verdt å vite" size="small">
          <List as="ul" size="small">{policy.notes.map((item, index) => <List.Item key={index}>{item}</List.Item>)}</List>
        </ReadMore>
      )}
      {policy.source?.type === 'document' && <Detail textColor="subtle">Hentet fra {policy.source.fileName}</Detail>}
    </VStack>
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
  const hasDetails = (policy: Policy) => policy.source?.type === 'document'

  return (
    <VStack gap="space-16" as="section" aria-label="Oppsummering av forsikringer">
      <HGrid columns={{ xs: 2, md: 3 }} gap="space-12">
        <Stat label="Selskaper" value={String(entries.length)} />
        <Stat label="Forsikringer" value={String(all.length)} />
        <Stat label="Totalt per måned" value={formatKr(sumPremium(all))} />
      </HGrid>

      {entries.map(([insurerId, policies]) => {
        const name = getInsurer(insurerId)?.name ?? policies[0]?.insurer ?? insurerId
        return (
          <ExpansionCard key={insurerId} size="small" aria-label={`Forsikringer hos ${name}`} defaultOpen={policies.some(hasDetails)}>
            <ExpansionCard.Header>
              <ExpansionCard.Title as="h3" size="small">{name}</ExpansionCard.Title>
              <ExpansionCard.Description>
                {policyCountLabel(policies.length)} · {formatKr(sumPremium(policies))}/mnd
              </ExpansionCard.Description>
            </ExpansionCard.Header>
            <ExpansionCard.Content>
              {policies.length === 0 ? (
                <BodyShort textColor="subtle">Ingen forsikringer funnet hos {name}.</BodyShort>
              ) : (
                <VStack as="ul" gap="space-16" className="policy-list">
                  {policies.map((policy) => (
                    <li key={policy.id}>
                      <HStack justify="space-between" align="start" gap="space-8" wrap={false}>
                        <div>
                          <BodyShort weight="semibold">{policy.product}</BodyShort>
                          {policy.coverage && <Detail textColor="subtle">{policy.coverage}</Detail>}
                        </div>
                        <VStack align="end" className="policy-list__price">
                          <BodyShort weight="semibold">{policy.premium ? `${formatKr(policy.premium)}/mnd` : '–'}</BodyShort>
                          {policy.deductible !== undefined && <Detail textColor="subtle">Egenandel {formatKr(policy.deductible)}</Detail>}
                        </VStack>
                      </HStack>
                      {hasDetails(policy)
                        ? <PolicyDetails policy={policy} />
                        : <Detail textColor="subtle">Fornyes {formatDate(policy.renewalDate)}{policy.policyNumber && ` · Nr. ${policy.policyNumber}`}</Detail>}
                      {onRemovePolicy && (
                        <Button variant="tertiary" size="small" className="touch-target" onClick={() => onRemovePolicy(policy)} aria-label={`Fjern ${policy.product}`}>
                          Fjern
                        </Button>
                      )}
                    </li>
                  ))}
                </VStack>
              )}
            </ExpansionCard.Content>
          </ExpansionCard>
        )
      })}
    </VStack>
  )
}
