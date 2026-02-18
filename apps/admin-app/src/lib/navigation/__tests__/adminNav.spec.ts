/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest'
import { adminNavGroups } from '@/lib/navigation/adminNav'

describe('adminNav config', () => {
  it('includes Payment Settings route', () => {
    const flat = adminNavGroups.flatMap(g => g.items.map(i => i.path))
    expect(flat).toContain('/settings/payment')
  })
})
