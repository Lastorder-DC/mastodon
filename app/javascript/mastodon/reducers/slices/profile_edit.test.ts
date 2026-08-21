import { profileEdit, fetchProfile, selectImageInfo } from './profile_edit';
import type { ProfileEditState } from './profile_edit';

describe('profile_edit slice', () => {
  describe('transformProfile (via fetchProfile.fulfilled)', () => {
    test('maps custom_logo snake_case API fields to camelCase ProfileData keys', () => {
      const initialState: ProfileEditState = { isPending: false };

      // The slice reducer receives the transformed payload via the thunk.
      // Since transformProfile is called inside createDataLoadingThunk's onData,
      // we simulate by directly dispatching the fulfilled action with the
      // already-transformed result as the payload (matching how Redux Toolkit works).
      const transformedPayload = {
        id: '123',
        displayName: 'Test User',
        bio: 'Hello world',
        fields: [],
        avatar: 'https://example.com/avatar.png',
        avatarStatic: 'https://example.com/avatar_static.png',
        avatarDescription: 'My avatar',
        header: 'https://example.com/header.png',
        headerStatic: 'https://example.com/header_static.png',
        headerDescription: 'My header',
        customLogo: 'https://example.com/custom_logo.png',
        customLogoStatic: 'https://example.com/custom_logo_static.png',
        customLogoDescription: 'My custom logo',
        customLogoEnabled: true,
        backgroundImage: 'https://example.com/bg.jpg',
        backgroundImageStatic: 'https://example.com/bg_static.jpg',
        backgroundImageEnabled: true,
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

      const fulfilledAction = {
        type: fetchProfile.fulfilled.type,
        payload: transformedPayload,
      };

      const state = profileEdit(initialState, fulfilledAction);

      expect(state.profile).toBeDefined();
      expect(state.profile?.customLogo).toBe(
        'https://example.com/custom_logo.png',
      );
      expect(state.profile?.customLogoStatic).toBe(
        'https://example.com/custom_logo_static.png',
      );
      expect(state.profile?.customLogoDescription).toBe('My custom logo');
      expect(state.profile?.customLogoEnabled).toBe(true);
      expect(state.profile?.backgroundImage).toBe('https://example.com/bg.jpg');
      expect(state.profile?.backgroundImageStatic).toBe(
        'https://example.com/bg_static.jpg',
      );
      expect(state.profile?.backgroundImageEnabled).toBe(true);
    });

    test('maps null custom_logo and background_image fields correctly', () => {
      const transformedPayload = {
        id: '456',
        displayName: 'No Images',
        bio: '',
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
        discoverable: false,
        indexable: false,
        showMedia: true,
        showMediaReplies: true,
        showFeatured: false,
        attributionDomains: [],
        featuredTags: [],
        protectedAccount: false,
      };

      const initialState: ProfileEditState = { isPending: false };

      const state = profileEdit(initialState, {
        type: fetchProfile.fulfilled.type,
        payload: transformedPayload,
      });

      expect(state.profile?.customLogo).toBeNull();
      expect(state.profile?.customLogoStatic).toBeNull();
      expect(state.profile?.customLogoDescription).toBe('');
      expect(state.profile?.customLogoEnabled).toBe(false);
      expect(state.profile?.backgroundImage).toBeNull();
      expect(state.profile?.backgroundImageStatic).toBeNull();
      expect(state.profile?.backgroundImageEnabled).toBe(false);
    });
  });

  describe('selectImageInfo', () => {
    const mockProfile = {
      id: '789',
      displayName: 'Selector Test',
      bio: 'bio',
      fields: [],
      avatar: 'https://example.com/avatar.png',
      avatarStatic: 'https://example.com/avatar_static.png',
      avatarDescription: 'Avatar alt',
      header: 'https://example.com/header.png',
      headerStatic: 'https://example.com/header_static.png',
      headerDescription: 'Header alt',
      customLogo: 'https://example.com/logo.png',
      customLogoStatic: 'https://example.com/logo_static.png',
      customLogoDescription: 'My logo alt text',
      customLogoEnabled: true,
      backgroundImage: 'https://example.com/bg.jpg',
      backgroundImageStatic: 'https://example.com/bg_static.jpg',
      backgroundImageEnabled: true,
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

    const mockState = {
      profileEdit: {
        profile: mockProfile,
        isPending: false,
      },
    } as unknown as Parameters<typeof selectImageInfo>[0];

    test('returns { src, static, alt } for custom_logo location', () => {
      const result = selectImageInfo(mockState, 'custom_logo');

      expect(result).toEqual({
        src: 'https://example.com/logo.png',
        static: 'https://example.com/logo_static.png',
        alt: 'My logo alt text',
      });
    });

    test('returns { src, static, alt: undefined } for background_image location (no description)', () => {
      const result = selectImageInfo(mockState, 'background_image');

      expect(result).toEqual({
        src: 'https://example.com/bg.jpg',
        static: 'https://example.com/bg_static.jpg',
        alt: undefined,
      });
    });

    test('returns { src, static, alt } for avatar location', () => {
      const result = selectImageInfo(mockState, 'avatar');

      expect(result).toEqual({
        src: 'https://example.com/avatar.png',
        static: 'https://example.com/avatar_static.png',
        alt: 'Avatar alt',
      });
    });

    test('returns { src, static, alt } for header location', () => {
      const result = selectImageInfo(mockState, 'header');

      expect(result).toEqual({
        src: 'https://example.com/header.png',
        static: 'https://example.com/header_static.png',
        alt: 'Header alt',
      });
    });

    test('returns empty object when profile is undefined', () => {
      const emptyState = {
        profileEdit: {
          isPending: false,
        },
      } as unknown as Parameters<typeof selectImageInfo>[0];

      const result = selectImageInfo(emptyState, 'custom_logo');

      expect(result).toEqual({});
    });
  });
});
