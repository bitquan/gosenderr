import { describe, expect, it } from 'vitest';

import {
  COURIER_SHELL_ITEMS,
  COURIER_SHELL_SECTIONS,
  resolveCourierShellTitle,
} from '../../src/lib/navigation/shellNav';

describe('courier shell navigation contract', () => {
  it('includes required launch routes in the shell', () => {
    const hrefs = COURIER_SHELL_ITEMS.map((item) => item.href);

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/jobs');
    expect(hrefs).toContain('/routes');
    expect(hrefs).toContain('/earnings');
    expect(hrefs).toContain('/settings');
  });

  it('exposes grouped sections for core + systems', () => {
    const sectionTitles = COURIER_SHELL_SECTIONS.map((section) => section.title);
    expect(sectionTitles).toContain('Core');
    expect(sectionTitles).toContain('Systems');
  });

  it('resolves titles by direct and nested route', () => {
    expect(resolveCourierShellTitle('/routes')).toBe('Routes');
    expect(resolveCourierShellTitle('/jobs/abc123')).toBe('Jobs');
    expect(resolveCourierShellTitle('/unknown')).toBe('Courier');
  });
});
