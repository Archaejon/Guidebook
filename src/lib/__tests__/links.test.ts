import { describe, expect, it } from 'vitest';
import { linkTarget } from '../utils';

/**
 * One rule for both renderers. The workspace used to activate any href the
 * author wrote while the HTML export only linkified http(s), so the same
 * `[label](javascript:…)` was clickable in one surface and inert in the other.
 */
describe('linkTarget', () => {
  it('accepts absolute web links and site-relative paths', () => {
    expect(linkTarget('https://example.com/a')).toEqual({ kind: 'external', href: 'https://example.com/a' });
    expect(linkTarget('HTTP://example.com')).toEqual({ kind: 'external', href: 'HTTP://example.com' });
    expect(linkTarget('/method/m_alpha')).toEqual({ kind: 'internal', href: '/method/m_alpha' });
    expect(linkTarget('  /read  ')).toEqual({ kind: 'internal', href: '/read' });
  });

  it('rejects every other target, including schemes that would execute', () => {
    const rejected = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'mailto:someone@example.com',
      '//evil.example/path',
      'method/m_alpha',
      '',
      '   ',
    ];
    for (const target of rejected) {
      expect(linkTarget(target), target).toBeNull();
    }
  });
});
