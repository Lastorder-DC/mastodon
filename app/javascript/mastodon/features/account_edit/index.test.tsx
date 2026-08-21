import { IntlProvider } from 'react-intl';

import { render, screen, fireEvent } from '@testing-library/react';

import { AccountEdit } from './index';

import '@testing-library/jest-dom';

// Mock dispatch and selector
const mockDispatch = vi.fn(() => Promise.resolve());
const mockProfileState: {
  profile: Record<string, unknown> | null;
  isPending: boolean;
} = {
  profile: null,
  isPending: false,
};

vi.mock('@/mastodon/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => {
    // The component calls useAppSelector twice:
    // 1. For profileEdit state
    // 2. For server.server.item?.configuration.accounts.max_profile_fields
    const mockState = {
      profileEdit: mockProfileState,
      server: {
        server: {
          item: {
            configuration: {
              accounts: {
                max_profile_fields: 4,
              },
            },
          },
        },
      },
    };
    return selector(mockState);
  },
}));

// Mock useAccount
const mockAccount = {
  id: 'user-1',
  acct: 'testuser',
  avatar: 'https://example.com/avatar.png',
  avatar_static: 'https://example.com/avatar_static.png',
};
vi.mock('@/mastodon/hooks/useAccount', () => ({
  useAccount: () => mockAccount,
}));

// Mock useCurrentAccountId
vi.mock('@/mastodon/hooks/useAccountId', () => ({
  useCurrentAccountId: () => 'user-1',
}));

// Mock useCustomEmojis
vi.mock('@/mastodon/hooks/useCustomEmojis', () => ({
  useCustomEmojis: () => [],
}));

// Mock the profile_edit slice actions/thunks
vi.mock('@/mastodon/reducers/slices/profile_edit', () => ({
  fetchProfile: () => ({ type: 'profileEdit/fetchProfile' }),
  patchProfile: (params: Record<string, unknown>) => ({
    type: 'profileEdit/patchProfile',
    payload: params,
  }),
  selectImageInfo: () => ({}),
}));

// Mock openModal
vi.mock('@/mastodon/actions/modal', () => ({
  openModal: (params: unknown) => ({ type: 'modal/open', payload: params }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useHistory: () => ({ push: vi.fn() }),
}));

// Mock initial_state
vi.mock('mastodon/initial_state', () => ({
  me: 'user-1',
  autoPlayGif: false,
}));

// Mock useElementHandledLink
vi.mock('@/mastodon/components/status/handled_link', () => ({
  useElementHandledLink: () => ({}),
}));

// Mock child components to simplify rendering
vi.mock('./components/column', () => ({
  AccountEditColumn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='account-edit-column'>{children}</div>
  ),
  AccountEditEmptyColumn: () => <div data-testid='empty-column' />,
}));

vi.mock('@/mastodon/components/account_bio', () => ({
  AccountBio: () => <div data-testid='account-bio' />,
}));

vi.mock('@/mastodon/components/avatar', () => ({
  Avatar: () => <div data-testid='avatar' />,
}));

vi.mock('@/mastodon/components/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/mastodon/components/callout/dismissible', () => ({
  DismissibleCallout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/mastodon/components/emoji/context', () => ({
  CustomEmojiProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('@/mastodon/components/emoji/html', () => ({
  EmojiHTML: ({ htmlString }: { htmlString: string }) => (
    <span>{htmlString}</span>
  ),
}));

vi.mock('./components/edit_button', () => ({
  EditButton: () => (
    <button type='button' data-testid='edit-button'>
      Edit
    </button>
  ),
}));

vi.mock('./components/field', () => ({
  AccountField: () => <div data-testid='account-field' />,
}));

vi.mock('./components/field_actions', () => ({
  AccountFieldActions: () => <div data-testid='field-actions' />,
}));

vi.mock('./components/image_edit', () => ({
  AccountImageEdit: ({ location }: { location: string }) => (
    <div data-testid={`image-edit-${location}`}>ImageEdit: {location}</div>
  ),
}));

vi.mock('./components/section', () => ({
  AccountEditSection: ({
    title,
    children,
    buttons,
  }: {
    title: { id: string; defaultMessage: string };
    children?: React.ReactNode;
    buttons?: React.ReactNode;
  }) => (
    <section data-testid={`section-${title.id}`}>
      <h3>{title.defaultMessage}</h3>
      {buttons}
      {children}
    </section>
  ),
}));

vi.mock('@/mastodon/components/form_fields', () => ({
  ToggleField: ({
    checked,
    onChange,
    disabled,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled: boolean;
    label: React.ReactNode;
  }) => (
    <label data-testid='toggle-field'>
      <input
        type='checkbox'
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        data-testid='toggle-input'
      />
      {label}
    </label>
  ),
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale='en' messages={{}}>
      {ui}
    </IntlProvider>,
  );
}

function getMockProfile(): Record<string, unknown> {
  if (!mockProfileState.profile) {
    throw new Error('Mock profile is not initialized');
  }

  return mockProfileState.profile;
}

describe('AccountEdit page - Custom Logo and Background Image sections', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockProfileState.profile = {
      id: 'user-1',
      displayName: 'Test User',
      bio: 'A bio',
      fields: [],
      avatar: 'https://example.com/avatar.png',
      avatarStatic: 'https://example.com/avatar_static.png',
      avatarDescription: '',
      header: 'https://example.com/header.png',
      headerStatic: 'https://example.com/header_static.png',
      headerDescription: '',
      customLogo: null,
      customLogoStatic: null,
      customLogoDescription: '',
      customLogoEnabled: false,
      backgroundImage: null,
      backgroundImageStatic: null,
      backgroundImageEnabled: false,
      locked: false,
      bot: false,
      hideCollections: false,
      discoverable: true,
      indexable: true,
      showMedia: true,
      showMediaReplies: true,
      showFeatured: true,
      attributionDomains: [],
      featuredTags: [],
      protectedAccount: false,
    };
    mockProfileState.isPending = false;
  });

  describe('Custom Logo section (Req 9.1, 9.3, 9.4, 9.7)', () => {
    it('renders the Custom Logo section with title', () => {
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.custom_logo.title',
      );
      expect(section).toBeInTheDocument();
      expect(section).toHaveTextContent('Custom logo');
    });

    it('renders an AccountImageEdit control for custom_logo', () => {
      renderWithIntl(<AccountEdit />);
      const imageEdit = screen.getByTestId('image-edit-custom_logo');
      expect(imageEdit).toBeInTheDocument();
    });

    it('renders a ToggleField for Custom Logo Enabled', () => {
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.custom_logo.title',
      );
      const toggle = section.querySelector('[data-testid="toggle-input"]');
      expect(toggle).toBeInTheDocument();
    });

    it('toggling Custom Logo dispatches patchProfile with custom_logo_enabled', () => {
      getMockProfile().customLogoEnabled = false;
      renderWithIntl(<AccountEdit />);
      mockDispatch.mockClear();

      const section = screen.getByTestId(
        'section-account_edit.custom_logo.title',
      );
      const toggle = section.querySelector(
        '[data-testid="toggle-input"]',
      ) as HTMLInputElement;
      fireEvent.click(toggle);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'profileEdit/patchProfile',
          payload: { custom_logo_enabled: true },
        }),
      );
    });

    it('renders a preview <img> when profile.customLogo is set', () => {
      getMockProfile().customLogo = 'https://example.com/logo.png';
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.custom_logo.title',
      );
      const img = section.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('does not render a preview <img> when profile.customLogo is null', () => {
      getMockProfile().customLogo = null;
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.custom_logo.title',
      );
      const img = section.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });
  });

  describe('Background Image section (Req 9.2, 9.5, 9.6, 9.8)', () => {
    it('renders the Background Image section with title', () => {
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.background_image.title',
      );
      expect(section).toBeInTheDocument();
      expect(section).toHaveTextContent('Background image');
    });

    it('renders an AccountImageEdit control for background_image', () => {
      renderWithIntl(<AccountEdit />);
      const imageEdit = screen.getByTestId('image-edit-background_image');
      expect(imageEdit).toBeInTheDocument();
    });

    it('renders a ToggleField for Background Image Enabled', () => {
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.background_image.title',
      );
      const toggle = section.querySelector('[data-testid="toggle-input"]');
      expect(toggle).toBeInTheDocument();
    });

    it('toggling Background Image dispatches patchProfile with background_image_enabled', () => {
      getMockProfile().backgroundImageEnabled = false;
      renderWithIntl(<AccountEdit />);
      mockDispatch.mockClear();

      const section = screen.getByTestId(
        'section-account_edit.background_image.title',
      );
      const toggle = section.querySelector(
        '[data-testid="toggle-input"]',
      ) as HTMLInputElement;
      fireEvent.click(toggle);

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'profileEdit/patchProfile',
          payload: { background_image_enabled: true },
        }),
      );
    });

    it('renders a preview <img> when profile.backgroundImage is set', () => {
      getMockProfile().backgroundImage = 'https://example.com/bg.jpg';
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.background_image.title',
      );
      const img = section.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/bg.jpg');
    });

    it('does not render a preview <img> when profile.backgroundImage is null', () => {
      getMockProfile().backgroundImage = null;
      renderWithIntl(<AccountEdit />);
      const section = screen.getByTestId(
        'section-account_edit.background_image.title',
      );
      const img = section.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty column when profile is null', () => {
      mockProfileState.profile = null;
      renderWithIntl(<AccountEdit />);
      expect(screen.getByTestId('empty-column')).toBeInTheDocument();
    });
  });
});
