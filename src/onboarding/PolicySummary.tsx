import { BodyShort, Box, Detail, ExpansionCard, HGrid, Table, VStack } from '@navikt/ds-react'
import { getInsurer } from './insurers.ts'
import { formatKr, policyCountLabel, sumPremium } from './format.ts'
import type { ConnectionState } from './types.ts'

const date = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box background="sunken" borderRadius="12" padding="space-12">
      <Detail textColor="subtle">{label}</Detail>
      <BodyShort size="large" weight="semibold">{value}</BodyShort>
    </Box>
  )
}

export default function PolicySummary({ connections }: { connections: ConnectionState }) {
  const entries = Object.entries(connections)
  const all = entries.flatMap(([, policies]) => policies)

  return (
    <VStack gap="space-16" as="section" aria-label="Oppsummering av forsikringer">
      <HGrid columns={{ xs: 2, md: 3 }} gap="space-12">
        <Stat label="Selskaper" value={String(entries.length)} />
        <Stat label="Forsikringer" value={String(all.length)} />
        <Stat label="Totalt per måned" value={formatKr(sumPremium(all))} />
      </HGrid>

      {entries.map(([insurerId, policies]) => {
        const name = getInsurer(insurerId)?.name ?? insurerId
        return (
          <ExpansionCard key={insurerId} size="small" aria-label={`Forsikringer hos ${name}`}>
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
                <Table size="small">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell scope="col">Forsikring</Table.HeaderCell>
                      <Table.HeaderCell scope="col">Fornyes</Table.HeaderCell>
                      <Table.HeaderCell scope="col" align="right">Pris/mnd</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {policies.map((policy) => (
                      <Table.Row key={policy.id}>
                        <Table.DataCell>
                          {policy.product}
                          {policy.coverage && <Detail textColor="subtle">{policy.coverage} · {policy.policyNumber}</Detail>}
                        </Table.DataCell>
                        <Table.DataCell>{date.format(new Date(policy.renewalDate))}</Table.DataCell>
                        <Table.DataCell align="right">{policy.premium ? formatKr(policy.premium) : '–'}</Table.DataCell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              )}
            </ExpansionCard.Content>
          </ExpansionCard>
        )
      })}
    </VStack>
  )
}
