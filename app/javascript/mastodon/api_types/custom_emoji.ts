// See app/serializers/rest/account_serializer.rb
export interface ApiCustomEmojiJSON {
  shortcode: string;
  static_url: string;
  url: string;
  category?: string;
  visible_in_picker: boolean;
  width?: number;
  height?: number;
  sensitive?: boolean;
  aliases?: string[];
  license?: string;
}
