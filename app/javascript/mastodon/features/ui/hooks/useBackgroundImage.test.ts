// Feature: custom-logo-and-background, Property 4: Background activation decision
// Validates: Requirements 8.1, 8.5, 8.6, 12.2

import { renderHook } from '@testing-library/react';

import { useBackgroundImage } from './useBackgroundImage';

// Polyfill CSS.escape for jsdom (not available in jsdom by default)
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).CSS = {};
}
if (typeof CSS.escape !== 'function') {
  CSS.escape = (value: string) => value.replace(/([^\w*-])/g, '\\$1');
}

// Mock useAccount and useCurrentAccountId
const { mockUseAccount, mockUseCurrentAccountId } = vi.hoisted(() => ({
  mockUseAccount: vi.fn(),
  mockUseCurrentAccountId: vi.fn(),
}));

vi.mock('@/mastodon/hooks/useAccount', () => ({
  useAccount: mockUseAccount,
}));

vi.mock('@/mastodon/hooks/useAccountId', () => ({
  useCurrentAccountId: mockUseCurrentAccountId,
}));

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: '123',
    background_image_enabled: false,
    background_image: '',
    ...overrides,
  };
}

// Property 4: Background activation decision
// The background class and CSS variable are set IFF background_image_enabled === true AND
// background_image is a non-empty URL string.
describe('useBackgroundImage – Property 4: Background activation decision', () => {
  beforeEach(() => {
    mockUseCurrentAccountId.mockReturnValue('123');
    // Clean up body state before each test
    document.body.classList.remove('custom-background');
    document.body.style.removeProperty('--custom-background-image');
  });

  afterEach(() => {
    // Verify cleanup
    vi.restoreAllMocks();
    document.body.classList.remove('custom-background');
    document.body.style.removeProperty('--custom-background-image');
  });

  // Table-driven: (background_image_enabled, background_image) combinations
  // plus pseudo-random URLs
  const testUrls = [
    'https://files.mastodon.social/media_attachments/bg_abc123.jpg',
    'https://cdn.example.org/images/user-bg-9f3e.png',
  ] as const;

  const combinations: {
    enabled: boolean;
    url: string;
    expectedActive: boolean;
    label: string;
  }[] = [
    // Core boolean x empty/non-empty combinations
    {
      enabled: true,
      url: testUrls[0],
      expectedActive: true,
      label: 'enabled=true, url=present(1)',
    },
    {
      enabled: true,
      url: testUrls[1],
      expectedActive: true,
      label: 'enabled=true, url=present(2)',
    },
    {
      enabled: true,
      url: '',
      expectedActive: false,
      label: 'enabled=true, url=empty',
    },
    {
      enabled: false,
      url: testUrls[0],
      expectedActive: false,
      label: 'enabled=false, url=present(1)',
    },
    {
      enabled: false,
      url: testUrls[1],
      expectedActive: false,
      label: 'enabled=false, url=present(2)',
    },
    {
      enabled: false,
      url: '',
      expectedActive: false,
      label: 'enabled=false, url=empty',
    },
  ];

  describe.each(combinations)(
    '$label → expectedActive=$expectedActive',
    ({ enabled, url, expectedActive }) => {
      it(`sets custom-background class: ${expectedActive}`, () => {
        mockUseAccount.mockReturnValue(
          makeAccount({
            background_image_enabled: enabled,
            background_image: url,
          }),
        );

        renderHook(() => {
          useBackgroundImage();
        });

        expect(document.body.classList.contains('custom-background')).toBe(
          expectedActive,
        );
      });

      it(`sets --custom-background-image CSS property: ${expectedActive}`, () => {
        mockUseAccount.mockReturnValue(
          makeAccount({
            background_image_enabled: enabled,
            background_image: url,
          }),
        );

        renderHook(() => {
          useBackgroundImage();
        });

        const cssValue = document.body.style.getPropertyValue(
          '--custom-background-image',
        );

        if (expectedActive) {
          expect(cssValue).toContain('url(');
          expect(cssValue).toContain(CSS.escape(url));
        } else {
          expect(cssValue).toBe('');
        }
      });
    },
  );

  it('removes class and CSS property on unmount', () => {
    mockUseAccount.mockReturnValue(
      makeAccount({
        background_image_enabled: true,
        background_image: testUrls[0],
      }),
    );

    const { unmount } = renderHook(() => {
      useBackgroundImage();
    });

    // Should be active
    expect(document.body.classList.contains('custom-background')).toBe(true);
    expect(
      document.body.style.getPropertyValue('--custom-background-image'),
    ).not.toBe('');

    // Unmount should clean up
    unmount();

    expect(document.body.classList.contains('custom-background')).toBe(false);
    expect(
      document.body.style.getPropertyValue('--custom-background-image'),
    ).toBe('');
  });
});
