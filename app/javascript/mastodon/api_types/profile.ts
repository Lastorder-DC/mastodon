import type { ApiAccountFieldJSON } from './accounts';
import type { ApiFeaturedTagJSON } from './tags';

export interface ApiProfileJSON {
  id: string;
  display_name: string;
  note: string;
  fields: ApiAccountFieldJSON[];
  avatar: string;
  avatar_static: string;
  avatar_description: string;
  header: string;
  header_static: string;
  header_description: string;
  custom_logo: string | null;
  custom_logo_static: string | null;
  custom_logo_description: string;
  custom_logo_enabled: boolean;
  background_image: string | null;
  background_image_static: string | null;
  background_image_enabled: boolean;
  locked: boolean;
  bot: boolean;
  hide_collections: boolean;
  discoverable: boolean;
  indexable: boolean;
  show_media: boolean;
  show_media_replies: boolean;
  show_featured: boolean;
  attribution_domains: string[];
  featured_tags: ApiFeaturedTagJSON[];
  protected_account: boolean;
}

export type ApiProfileUpdateParams = Partial<
  Pick<
    ApiProfileJSON,
    | 'avatar_description'
    | 'header_description'
    | 'custom_logo_description'
    | 'custom_logo_enabled'
    | 'background_image_enabled'
    | 'display_name'
    | 'note'
    | 'locked'
    | 'bot'
    | 'hide_collections'
    | 'discoverable'
    | 'indexable'
    | 'show_media'
    | 'show_media_replies'
    | 'show_featured'
    | 'protected_account'
  >
> & {
  attribution_domains?: string[];
  fields_attributes?: Pick<ApiAccountFieldJSON, 'name' | 'value'>[];
};
