import type { Policy } from './types.ts'

const kr = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })

export const formatKr = (value: number) => `${kr.format(value)} kr`
export const sumPremium = (policies: Policy[]) => policies.reduce((sum, policy) => sum + policy.premium, 0)
export const policyCountLabel = (count: number) => `${count} ${count === 1 ? 'forsikring' : 'forsikringer'}`
