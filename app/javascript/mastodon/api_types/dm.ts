import type { ApiAccountJSON } from './accounts';
import type { ApiMediaAttachmentJSON } from './media_attachments';

export interface ApiDmMessageJSON {
  id: string;
  dm_chat_room_uuid: string;
  account: ApiAccountJSON;
  content: string;
  content_plain: string;
  in_reply_to_id: string | null;
  attachments: ApiMediaAttachmentJSON[];
  created_at: string;
  language: string | null;
}

export interface ApiDmReadReceiptJSON {
  account_id: string;
  last_read_message_id: string;
}

export interface ApiDmChatRoomJSON {
  id: string;
  uuid: string;
  room_type: string;
  title: string;
  owner: ApiAccountJSON;
  participants: ApiAccountJSON[];
  last_message: ApiDmMessageJSON | null;
  unread: boolean;
  accepted: boolean;
  last_message_at: string;
  created_at: string;
  read_receipts?: ApiDmReadReceiptJSON[];
}

export interface ApiDmUnreadCountJSON {
  count: number;
}
