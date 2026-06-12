# Requirements Document

## Introduction

This feature adds two **per-user** (not instance-level) interface customizations to this Mastodon fork:

1. **Custom Logo** — each local user can upload an image that replaces the default Mastodon wordmark logo in their own web interface navigation panel.
2. **Background Image** — each local user can upload an image that is displayed behind their own web interface, applied through `body:before` with a darkening filter at desktop viewport widths.

Both customizations are managed from two **new sections** added to the existing React-based profile edit page (`/profile/edit`, the `AccountEdit` feature). Each customization is independent: it has its own stored image and its own enable flag, and each affects only the **owning user's own authenticated session** — it is neither shared with other users nor federated to other servers.

The implementation reuses the established account-image patterns already present in the codebase:

- **Storage**: Per-user image attachments on the `accounts` table, mirroring how `avatar` and `header` attachments are defined via the `Account::Avatar` / `Account::Header` concerns, processed through the `Attachmentable` concern, and persisted with associated columns (file name, content type, file size, updated-at, description).
- **API**: Read/update through `Api::V1::ProfilesController` (`v1/profile`), with new fields added to the strong-parameter permit list and dedicated delete endpoints mirroring `Api::V1::Profile::AvatarsController` / `HeadersController`.
- **Serialization**: New fields surfaced through `REST::ProfileSerializer` (for the editor) and delivered to the owner's web client (the current user's account is delivered to the client at boot through `InitialStateSerializer`).
- **Client state**: New fields round-tripped through `app/javascript/mastodon/api_types/profile.ts` and the `profile_edit` Redux slice (`fetchProfile`, `patchProfile`, `uploadImage`, `deleteImage`, `selectImageInfo`).
- **UI**: New `AccountEditSection` blocks reusing the existing `image_edit` control and the `ImageUploadModal` / `ImageDeleteModal` flow (select → crop → alt → save).
- **Rendering**: The custom logo overrides `WordmarkLogo` inside `.navigation-panel__logo`; the background image is injected at the `document.body` level (the web UI already toggles body-level classes in `features/ui/index.jsx`).

## Glossary

- **Account**: The `Account` ActiveRecord model (`app/models/account.rb`) representing a local user account, where per-user image attachments and per-user setting flags are persisted on the `accounts` table.
- **Custom_Logo**: A per-user uploaded image attachment that replaces the Wordmark_Logo in the owning user's Web_Interface.
- **Custom_Logo_Enabled**: A boolean flag on the Account that controls whether the Custom_Logo is rendered.
- **Background_Image**: A per-user uploaded image attachment that is displayed behind the owning user's Web_Interface.
- **Background_Image_Enabled**: A boolean flag on the Account that controls whether the Background_Image is rendered.
- **Profile_Edit_Page**: The React feature rendered at route `/profile/edit` (the `AccountEdit` component, `app/javascript/mastodon/features/account_edit/index.tsx`).
- **Custom_Logo_Section**: A new section on the Profile_Edit_Page for managing the Custom_Logo, built with the existing `AccountEditSection` component.
- **Background_Image_Section**: A new section on the Profile_Edit_Page for managing the Background_Image, built with the existing `AccountEditSection` component.
- **Profile_API**: The REST endpoint backed by `Api::V1::ProfilesController` that serves `GET v1/profile` and `PATCH v1/profile`.
- **Profile_Serializer**: `REST::ProfileSerializer`, which serializes profile data consumed by the Profile_Edit_Page.
- **Account_Delivery**: The mechanism that delivers the current user's own account/profile data to that user's Web_Interface at application boot (`InitialStateSerializer`), and on demand through the Profile_API.
- **Image_Upload_Modal**: The React modal flow used to upload account images (`ImageUploadModal`), comprising select, crop, and alt-text steps.
- **Image_Processor**: The server-side attachment processing pipeline (`Attachmentable` concern plus Paperclip attachment definitions) that validates and transforms uploaded images.
- **Navigation_Panel**: The React `NavigationPanel` component (`app/javascript/mastodon/features/navigation_panel/index.tsx`) that renders the logo inside `.navigation-panel__logo`.
- **Wordmark_Logo**: The default Mastodon wordmark SVG logo (`WordmarkLogo`, `app/javascript/mastodon/components/logo.tsx`).
- **Web_Interface**: The Mastodon single-page React web application as rendered for a signed-in user.
- **Desktop_Breakpoint**: A viewport width of 890px; the minimum viewport width at which the Background_Image is displayed.
- **Darkening_Filter**: A CSS `brightness(0.15)` filter applied to the displayed Background_Image so foreground interface content remains legible.
- **Supported_Image_Types**: The set of accepted upload MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- **Maximum_Image_Size**: An upload size limit of 8 megabytes per image.
- **Maximum_Pixel_Area**: The pixel-area limits enforced by the Image_Processor: 33,177,600 pixels for non-GIF images and 921,600 pixels for GIF images.

## Requirements

### Requirement 1: Custom Logo Storage

**User Story:** As a signed-in user, I want to upload a custom logo image to my account, so that my own web interface displays my branding instead of the default Mastodon wordmark.

#### Acceptance Criteria

1. WHEN a signed-in user uploads a Custom_Logo through the Profile_API, THE Account SHALL persist the Custom_Logo as a per-user image attachment associated with that user's Account.
2. THE Account SHALL store the Custom_Logo independently for each local user account.
3. WHEN a signed-in user uploads a Custom_Logo, THE Image_Processor SHALL remove embedded image metadata from the stored Custom_Logo.
4. WHEN a signed-in user uploads a Custom_Logo, THE Account SHALL persist the content type, file size, and stored file name of the Custom_Logo.
5. WHERE a signed-in user provides alternative text with a Custom_Logo upload, THE Account SHALL persist the alternative text for the Custom_Logo.

### Requirement 2: Custom Logo Upload Validation

**User Story:** As a signed-in user, I want invalid logo uploads to be rejected with clear feedback, so that only valid images are stored on my account.

#### Acceptance Criteria

1. IF an uploaded Custom_Logo has a MIME type outside Supported_Image_Types, THEN THE Profile_API SHALL reject the upload and return a validation error response with HTTP status 422.
2. IF an uploaded Custom_Logo exceeds Maximum_Image_Size, THEN THE Profile_API SHALL reject the upload and return a validation error response with HTTP status 422.
3. IF an uploaded Custom_Logo exceeds Maximum_Pixel_Area, THEN THE Image_Processor SHALL reject the upload and return a validation error response with HTTP status 422.
4. WHERE a signed-in user provides Custom_Logo alternative text longer than 150 characters, THE Profile_API SHALL reject the update and return a validation error response with HTTP status 422.

### Requirement 3: Custom Logo Enable Flag

**User Story:** As a signed-in user, I want to turn my custom logo on or off without deleting it, so that I can switch between my logo and the default wordmark while keeping my uploaded image.

#### Acceptance Criteria

1. THE Account SHALL store the Custom_Logo_Enabled flag for each local user account.
2. WHEN a signed-in user sets Custom_Logo_Enabled to true through the Profile_API, THE Account SHALL persist Custom_Logo_Enabled as true.
3. WHEN a signed-in user sets Custom_Logo_Enabled to false through the Profile_API, THE Account SHALL persist Custom_Logo_Enabled as false.
4. THE Account SHALL default Custom_Logo_Enabled to false for newly created accounts.

### Requirement 4: Custom Logo Rendering

**User Story:** As a signed-in user, I want my custom logo shown in the navigation panel, so that my branding appears in the place where the Mastodon wordmark normally appears.

#### Acceptance Criteria

1. WHILE Custom_Logo_Enabled is true AND a Custom_Logo is stored, THE Navigation_Panel SHALL render the Custom_Logo in place of the Wordmark_Logo for the owning user's Web_Interface.
2. WHILE Custom_Logo_Enabled is false, THE Navigation_Panel SHALL render the Wordmark_Logo.
3. IF no Custom_Logo is stored, THEN THE Navigation_Panel SHALL render the Wordmark_Logo.
4. WHEN the Navigation_Panel renders the Custom_Logo, THE Navigation_Panel SHALL preserve the existing logo link target to the home route (`/`).
5. WHEN the Navigation_Panel renders the Custom_Logo, THE Navigation_Panel SHALL provide the Custom_Logo alternative text as the accessible name, defaulting to "Mastodon" when no alternative text is stored.

### Requirement 5: Background Image Storage

**User Story:** As a signed-in user, I want to upload a background image to my account, so that my own web interface displays my chosen background.

#### Acceptance Criteria

1. WHEN a signed-in user uploads a Background_Image through the Profile_API, THE Account SHALL persist the Background_Image as a per-user image attachment associated with that user's Account.
2. THE Account SHALL store the Background_Image independently for each local user account.
3. WHEN a signed-in user uploads a Background_Image, THE Image_Processor SHALL remove embedded image metadata from the stored Background_Image.
4. WHEN a signed-in user uploads a Background_Image, THE Account SHALL persist the content type, file size, and stored file name of the Background_Image.

### Requirement 6: Background Image Upload Validation

**User Story:** As a signed-in user, I want invalid background uploads to be rejected with clear feedback, so that only valid images are stored on my account.

#### Acceptance Criteria

1. IF an uploaded Background_Image has a MIME type outside Supported_Image_Types, THEN THE Profile_API SHALL reject the upload and return a validation error response with HTTP status 422.
2. IF an uploaded Background_Image exceeds Maximum_Image_Size, THEN THE Profile_API SHALL reject the upload and return a validation error response with HTTP status 422.
3. IF an uploaded Background_Image exceeds Maximum_Pixel_Area, THEN THE Image_Processor SHALL reject the upload and return a validation error response with HTTP status 422.

### Requirement 7: Background Image Enable Flag

**User Story:** As a signed-in user, I want to turn my background image on or off without deleting it, so that I can return to the default interface background while keeping my uploaded image.

#### Acceptance Criteria

1. THE Account SHALL store the Background_Image_Enabled flag for each local user account.
2. WHEN a signed-in user sets Background_Image_Enabled to true through the Profile_API, THE Account SHALL persist Background_Image_Enabled as true.
3. WHEN a signed-in user sets Background_Image_Enabled to false through the Profile_API, THE Account SHALL persist Background_Image_Enabled as false.
4. THE Account SHALL default Background_Image_Enabled to false for newly created accounts.

### Requirement 8: Background Image Rendering

**User Story:** As a signed-in user, I want my background image displayed behind my interface on desktop widths with a darkening filter, so that my background is visible while my interface content stays legible.

#### Acceptance Criteria

1. WHILE Background_Image_Enabled is true AND a Background_Image is stored AND the viewport width is greater than or equal to the Desktop_Breakpoint, THE Web_Interface SHALL display the Background_Image behind the interface content for the owning user's Web_Interface.
2. WHILE the Background_Image is displayed, THE Web_Interface SHALL apply the Darkening_Filter to the Background_Image.
3. WHILE the Background_Image is displayed, THE Web_Interface SHALL position the Background_Image to cover the viewport, anchored to the top, and remain fixed during scrolling.
4. WHILE the viewport width is less than the Desktop_Breakpoint, THE Web_Interface SHALL render the default interface background.
5. WHILE Background_Image_Enabled is false, THE Web_Interface SHALL render the default interface background.
6. IF no Background_Image is stored, THEN THE Web_Interface SHALL render the default interface background.
7. THE Web_Interface SHALL render the Background_Image as a decorative element that is excluded from the accessibility tree.

### Requirement 9: Profile Edit Page Sections

**User Story:** As a signed-in user, I want logo and background controls on my profile edit page, so that I can manage them where I already manage my avatar and header.

#### Acceptance Criteria

1. THE Profile_Edit_Page SHALL display a Custom_Logo_Section rendered with the existing account edit section component and styling.
2. THE Profile_Edit_Page SHALL display a Background_Image_Section rendered with the existing account edit section component and styling.
3. THE Custom_Logo_Section SHALL provide controls to upload, replace, and remove the Custom_Logo.
4. THE Custom_Logo_Section SHALL provide a toggle control that sets Custom_Logo_Enabled.
5. THE Background_Image_Section SHALL provide controls to upload, replace, and remove the Background_Image.
6. THE Background_Image_Section SHALL provide a toggle control that sets Background_Image_Enabled.
7. WHEN a signed-in user opens the Profile_Edit_Page AND a Custom_Logo is stored, THE Custom_Logo_Section SHALL display a preview of the stored Custom_Logo.
8. WHEN a signed-in user opens the Profile_Edit_Page AND a Background_Image is stored, THE Background_Image_Section SHALL display a preview of the stored Background_Image.

### Requirement 10: Image Upload, Replace, and Remove Flow

**User Story:** As a signed-in user, I want to upload, replace, and remove my logo and background using the same modal flow as my avatar and header, so that the experience is consistent.

#### Acceptance Criteria

1. WHEN a signed-in user starts a Custom_Logo or Background_Image upload, THE Image_Upload_Modal SHALL allow the user to select an image file whose MIME type is within Supported_Image_Types.
2. WHEN a signed-in user selects a non-animated image for a Custom_Logo or Background_Image, THE Image_Upload_Modal SHALL allow the user to crop the image before upload.
3. WHEN a signed-in user selects an animated GIF image for a Custom_Logo or Background_Image, THE Image_Upload_Modal SHALL skip the crop step.
4. WHEN a signed-in user confirms a replacement image for a Custom_Logo or Background_Image, THE Account SHALL retain only the most recently uploaded image for that attachment.
5. WHEN a signed-in user removes the Custom_Logo, THE Profile_API SHALL delete the stored Custom_Logo attachment from the Account.
6. WHEN a signed-in user removes the Background_Image, THE Profile_API SHALL delete the stored Background_Image attachment from the Account.

### Requirement 11: API and Serialization Round-Trip

**User Story:** As a developer, I want the new fields to round-trip through the API and client state, so that the editor and interface always reflect the stored values.

#### Acceptance Criteria

1. WHEN the Profile_Edit_Page requests profile data through the Profile_API, THE Profile_Serializer SHALL include the Custom_Logo URL, the Custom_Logo alternative text, Custom_Logo_Enabled, the Background_Image URL, and Background_Image_Enabled.
2. WHEN a signed-in user submits Custom_Logo_Enabled or Background_Image_Enabled through the Profile_API, THE Profile_API SHALL accept those parameters in the permitted parameter set and persist them on the Account.
3. FOR ALL combinations of Custom_Logo_Enabled and Background_Image_Enabled values, updating the flags through the Profile_API and then reading the profile through the Profile_API SHALL return the same flag values that were submitted (round-trip property).
4. IF a Profile_API update request includes parameters outside the permitted parameter set, THEN THE Profile_API SHALL ignore the non-permitted parameters.
5. WHEN the owning user's account data is delivered through Account_Delivery, THE Account_Delivery SHALL include the Custom_Logo URL, Custom_Logo_Enabled, the Background_Image URL, and Background_Image_Enabled.

### Requirement 12: Default Behavior and Compatibility

**User Story:** As a signed-in user who has not configured these features, I want the interface to behave exactly as before, so that the new feature does not disrupt the default experience.

#### Acceptance Criteria

1. IF a signed-in user has not stored a Custom_Logo, THEN THE Web_Interface SHALL display the Wordmark_Logo.
2. IF a signed-in user has not stored a Background_Image, THEN THE Web_Interface SHALL display the default interface background.
3. THE Account SHALL continue to process avatar and header attachments using the existing avatar and header behavior.
4. WHEN a signed-in user submits a Profile_API update that omits the Custom_Logo and Background_Image fields, THE Profile_API SHALL leave the stored Custom_Logo, Background_Image, and their enable flags unchanged.

### Requirement 13: Per-User Scope and Federation Exclusion

**User Story:** As a signed-in user, I want my logo and background to remain private to my own session, so that they are not shared with other users or other servers.

#### Acceptance Criteria

1. THE Web_Interface SHALL apply a user's Custom_Logo and Background_Image only within that user's own authenticated session.
2. THE Account's ActivityPub actor representation SHALL omit the Custom_Logo and the Background_Image.
3. WHEN a signed-in user updates the Custom_Logo, Background_Image, or their enable flags, THE Profile_API SHALL persist the changes without altering the avatar or header presented in the Account's public profile.
