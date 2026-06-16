// Feature: custom-logo-and-background, Property 2: Logo render decision
// Feature: custom-logo-and-background, Property 3: Logo alternative-text default

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { NavigationLogo } from './navigation_logo';

// Mock the useAccount hook
const mockUseAccount = vi.fn();
vi.mock('@/mastodon/hooks/useAccount', () => ({
  useAccount: (...args: unknown[]) => mockUseAccount(...args),
}));

// Mock initial_state
const mockInitialState: Record<string, unknown> = {
  me: 'user-1',
  autoPlayGif: false,
};
vi.mock('mastodon/initial_state', () => ({
  get me() {
    return mockInitialState.me;
  },
  get autoPlayGif() {
    return mockInitialState.autoPlayGif;
  },
}));

// Mock WordmarkLogo
vi.mock('mastodon/components/logo', () => ({
  WordmarkLogo: () => <div data-testid='wordmark-logo'>WordmarkLogo</div>,
}));

// **Validates: Requirements 4.1, 4.2, 4.3, 12.1**
describe('Property 2: Logo render decision', () => {
  const logoUrls = [
    'https://files.mastodon.social/accounts/custom_logo/000/001/logo.png',
    'https://cdn.example.org/random-logo-12345.webp',
  ];

  const cases: Array<{
    label: string;
    custom_logo_enabled: boolean;
    custom_logo: string;
    shouldRenderCustom: boolean;
  }> = [
    {
      label: 'enabled=true, url=present',
      custom_logo_enabled: true,
      custom_logo: logoUrls[0]!,
      shouldRenderCustom: true,
    },
    {
      label: 'enabled=true, url=empty',
      custom_logo_enabled: true,
      custom_logo: '',
      shouldRenderCustom: false,
    },
    {
      label: 'enabled=false, url=present',
      custom_logo_enabled: false,
      custom_logo: logoUrls[1]!,
      shouldRenderCustom: false,
    },
    {
      label: 'enabled=false, url=empty',
      custom_logo_enabled: false,
      custom_logo: '',
      shouldRenderCustom: false,
    },
    {
      label: 'enabled=true, url=pseudo-random-1',
      custom_logo_enabled: true,
      custom_logo: 'https://storage.example.net/logo-abc123.gif',
      shouldRenderCustom: true,
    },
    {
      label: 'enabled=true, url=pseudo-random-2',
      custom_logo_enabled: true,
      custom_logo: 'https://media.server.test/uploads/custom/xyz-789.png',
      shouldRenderCustom: true,
    },
  ];

  describe.each(cases)(
    '$label',
    ({ custom_logo_enabled, custom_logo, shouldRenderCustom }) => {
      beforeEach(() => {
        mockUseAccount.mockReturnValue({
          custom_logo_enabled,
          custom_logo,
          custom_logo_static: custom_logo
            ? custom_logo.replace('.gif', '_static.png')
            : '',
          custom_logo_description: 'My Logo',
        });
      });

      if (shouldRenderCustom) {
        it('renders the custom <img> when enabled && url', () => {
          render(<NavigationLogo />);
          const img = screen.getByRole('img', { name: 'My Logo' });
          expect(img).toBeInTheDocument();
          expect(img.tagName).toBe('IMG');
          expect(screen.queryByTestId('wordmark-logo')).not.toBeInTheDocument();
        });
      } else {
        it('renders WordmarkLogo when not (enabled && url)', () => {
          render(<NavigationLogo />);
          expect(screen.getByTestId('wordmark-logo')).toBeInTheDocument();
          expect(
            screen.queryByRole('img', { name: 'My Logo' }),
          ).not.toBeInTheDocument();
        });
      }
    },
  );
});

// **Validates: Requirements 4.5**
describe('Property 3: Logo alternative-text default', () => {
  // The component uses `description || 'Mastodon'`, so the fallback only
  // activates for falsy values (empty string). Whitespace-only strings are
  // truthy and get used as the alt attribute; the accessible name computation
  // trims them, yielding an empty accessible name in the DOM.
  const descriptionCases: Array<{
    label: string;
    description: string;
    expectedAlt: string;
  }> = [
    {
      label: 'non-empty description',
      description: 'My Custom Brand',
      expectedAlt: 'My Custom Brand',
    },
    {
      label: 'empty string description defaults to Mastodon',
      description: '',
      expectedAlt: 'Mastodon',
    },
    {
      label: 'single-word description',
      description: 'Acme',
      expectedAlt: 'Acme',
    },
    {
      label: 'description with inner spaces preserved',
      description: 'My Cool Brand',
      expectedAlt: 'My Cool Brand',
    },
    {
      label: 'unicode description',
      description: 'ブランドロゴ',
      expectedAlt: 'ブランドロゴ',
    },
    {
      label: 'description with emoji',
      description: 'My Logo 🎨',
      expectedAlt: 'My Logo 🎨',
    },
  ];

  it.each(descriptionCases)(
    'alt text is "$expectedAlt" when description is "$description" ($label)',
    ({ description, expectedAlt }) => {
      mockUseAccount.mockReturnValue({
        custom_logo_enabled: true,
        custom_logo: 'https://example.com/logo.png',
        custom_logo_static: 'https://example.com/logo_static.png',
        custom_logo_description: description,
      });

      render(<NavigationLogo />);
      const img = screen.getByRole('img');
      expect(img).toHaveAccessibleName(expectedAlt);
    },
  );
});
