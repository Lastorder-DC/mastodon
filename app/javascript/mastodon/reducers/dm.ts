import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import type { ApiCustomEmojiJSON } from 'mastodon/api_types/custom_emoji';
import type {
  ApiDmChatRoomJSON,
  ApiDmMessageJSON,
} from 'mastodon/api_types/dm';

import {
  DM_CHAT_ROOMS_FETCH_REQUEST,
  DM_CHAT_ROOMS_FETCH_SUCCESS,
  DM_CHAT_ROOMS_FETCH_FAIL,
  DM_MESSAGES_FETCH_REQUEST,
  DM_MESSAGES_FETCH_SUCCESS,
  DM_MESSAGES_FETCH_FAIL,
  DM_MESSAGE_SEND_SUCCESS,
  DM_MESSAGE_SEND_OPTIMISTIC,
  DM_MESSAGE_SEND_FAIL,
  DM_MESSAGE_RECEIVED,
  DM_MESSAGE_DELETED,
  DM_CHAT_ROOM_UPDATED,
  DM_CHAT_ROOM_READ,
  DM_UNREAD_COUNT_FETCH_SUCCESS,
  DM_UNREAD_COUNT_INCREMENT,
  DM_SET_ACTIVE_ROOM,
  DM_MIGRATION_IN_PROGRESS,
  DM_MIGRATION_COMPLETE,
  DM_MESSAGE_REMOVE_FAILED,
  DM_READ_RECEIPT_RECEIVED,
  DM_CHAT_ROOM_LEFT,
} from '../actions/dm';

export interface DmChatRoomParticipant {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  avatar_static: string;
  acct: string;
}

export interface DmChatRoom {
  id: string;
  uuid: string;
  room_type: string;
  title: string;
  owner_id: string;
  participant_ids: string[];
  participants: DmChatRoomParticipant[];
  last_message: ApiDmMessageJSON | null;
  unread: boolean;
  accepted: boolean;
  last_message_at: string;
  created_at: string;
  readReceipts: Record<string, string>;
}

export interface DmMessage {
  id: string;
  dm_chat_room_uuid: string;
  account_id: string;
  content: string;
  content_plain: string;
  in_reply_to_id: string | null;
  attachments: unknown[];
  emojis: ApiCustomEmojiJSON[];
  created_at: string;
  language: string | null;
  pending?: boolean;
  failed?: boolean;
  tempId?: string;
}

interface MessagesState {
  items: DmMessage[];
  isLoading: boolean;
  hasMore: boolean;
}

export interface DmState {
  chatRooms: {
    items: Record<string, DmChatRoom>;
    orderedIds: string[];
    isLoading: boolean;
    hasMore: boolean;
  };
  messages: Record<string, MessagesState>;
  accounts: Record<string, DmChatRoomParticipant>;
  idToUuid: Record<string, string>;
  unreadCount: number;
  activeRoomId: string | null;
  migrationInProgress: boolean;
}

const initialState: DmState = {
  chatRooms: {
    items: {},
    orderedIds: [],
    isLoading: false,
    hasMore: true,
  },
  messages: {},
  accounts: {},
  idToUuid: {},
  unreadCount: 0,
  activeRoomId: null,
  migrationInProgress: false,
};

const defaultMessagesState: MessagesState = {
  items: [],
  isLoading: false,
  hasMore: true,
};

const normalizeChatRoom = (room: ApiDmChatRoomJSON): DmChatRoom => ({
  id: room.id,
  uuid: room.uuid,
  room_type: room.room_type,
  title: room.title,
  owner_id: room.owner.id,
  participant_ids: room.participants.map((p) => p.id),
  participants: room.participants.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar: p.avatar,
    avatar_static: p.avatar_static,
    acct: p.acct,
  })),
  last_message: room.last_message,
  unread: room.unread,
  accepted: room.accepted,
  last_message_at: room.last_message_at,
  created_at: room.created_at,
  readReceipts: (room.read_receipts ?? []).reduce<Record<string, string>>(
    (acc, r) => {
      acc[r.account_id] = r.last_read_message_id;
      return acc;
    },
    {},
  ),
});

const normalizeMessage = (msg: ApiDmMessageJSON): DmMessage => ({
  id: msg.id,
  dm_chat_room_uuid: msg.dm_chat_room_uuid,
  account_id: msg.account.id,
  content: msg.content,
  content_plain: msg.content_plain,
  in_reply_to_id: msg.in_reply_to_id,
  attachments: msg.attachments,
  emojis: msg.emojis,
  created_at: msg.created_at,
  language: msg.language,
});

const normalizeAccount = (account: ApiAccountJSON): DmChatRoomParticipant => ({
  id: account.id,
  username: account.username,
  display_name: account.display_name,
  avatar: account.avatar,
  avatar_static: account.avatar_static,
  acct: account.acct,
});

const getMessagesState = (
  messages: Record<string, MessagesState>,
  roomId: string,
): MessagesState => messages[roomId] ?? defaultMessagesState;

// eslint-disable-next-line import/no-default-export
export default function dm(
  state: DmState = initialState,
  action: { type: string; [key: string]: unknown },
): DmState {
  switch (action.type) {
    case DM_CHAT_ROOMS_FETCH_REQUEST:
      return {
        ...state,
        chatRooms: { ...state.chatRooms, isLoading: true },
      };

    case DM_CHAT_ROOMS_FETCH_SUCCESS: {
      const rooms = action.chatRooms as ApiDmChatRoomJSON[];
      const newItems: Record<string, DmChatRoom> = { ...state.chatRooms.items };
      const newIds: string[] = [...state.chatRooms.orderedIds];
      const newIdToUuid: Record<string, string> = { ...state.idToUuid };
      const newAccounts: Record<string, DmChatRoomParticipant> = {
        ...state.accounts,
      };

      for (const room of rooms) {
        newItems[room.uuid] = normalizeChatRoom(room);
        if (!newIds.includes(room.uuid)) {
          newIds.push(room.uuid);
        }
        newIdToUuid[room.id] = room.uuid;
        for (const participant of room.participants) {
          newAccounts[participant.id] = normalizeAccount(participant);
        }
      }

      return {
        ...state,
        chatRooms: {
          items: newItems,
          orderedIds: newIds,
          isLoading: false,
          hasMore: rooms.length > 0,
        },
        idToUuid: newIdToUuid,
        accounts: newAccounts,
        migrationInProgress:
          rooms.length > 0 ? false : state.migrationInProgress,
      };
    }

    case DM_CHAT_ROOMS_FETCH_FAIL:
      return {
        ...state,
        chatRooms: { ...state.chatRooms, isLoading: false },
      };

    case DM_MESSAGES_FETCH_REQUEST: {
      const roomId = action.roomId as string;
      const existing = getMessagesState(state.messages, roomId);
      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: { ...existing, isLoading: true },
        },
      };
    }

    case DM_MESSAGES_FETCH_SUCCESS: {
      const roomId = action.roomId as string;
      const messages = action.messages as ApiDmMessageJSON[];
      const existing = getMessagesState(state.messages, roomId);
      const existingIds = new Set(existing.items.map((m) => m.id));
      const newMessages = messages
        .filter((m) => !existingIds.has(m.id))
        .map(normalizeMessage);

      const merged = [...existing.items, ...newMessages].sort((a, b) => {
        // Primary: created_at for correct chronological order
        if (a.created_at < b.created_at) return -1;
        if (a.created_at > b.created_at) return 1;
        // Tie-breaker: id for consistent ordering within same second
        if (a.id.length !== b.id.length) return a.id.length - b.id.length;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

      const newAccounts: Record<string, DmChatRoomParticipant> = {
        ...state.accounts,
      };
      for (const msg of messages) {
        newAccounts[msg.account.id] = normalizeAccount(msg.account);
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: {
            items: merged,
            isLoading: false,
            hasMore: messages.length > 0,
          },
        },
        accounts: newAccounts,
      };
    }

    case DM_MESSAGES_FETCH_FAIL: {
      const roomId = action.roomId as string;
      const existing = getMessagesState(state.messages, roomId);
      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: { ...existing, isLoading: false },
        },
      };
    }

    case DM_MESSAGE_SEND_SUCCESS: {
      const roomId = action.roomId as string;
      const message = normalizeMessage(action.message as ApiDmMessageJSON);
      const tempId = action.tempId as string | undefined;
      const existing = getMessagesState(state.messages, roomId);
      // Filter out both the optimistic placeholder (by tempId) AND any copy of
      // this same real message that the 3s poll (in chat_room_view.tsx) may
      // have already inserted while we were waiting for this send to resolve -
      // without the id check, that race produced a permanent duplicate.
      const filteredItems = existing.items.filter(
        (m) => m.tempId !== tempId && m.id !== message.id,
      );

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: {
            ...existing,
            items: [...filteredItems, message],
          },
        },
      };
    }

    case DM_MESSAGE_RECEIVED: {
      const payload = action.payload as ApiDmMessageJSON;
      // Use dm_chat_room_uuid as the key for messages
      const roomUuid = payload.dm_chat_room_uuid;
      const message = normalizeMessage(payload);
      const existing = getMessagesState(state.messages, roomUuid);
      const alreadyExists = existing.items.some((m) => m.id === message.id);

      if (alreadyExists) {
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomUuid]: {
            ...existing,
            items: [...existing.items, message],
          },
        },
        accounts: {
          ...state.accounts,
          [payload.account.id]: normalizeAccount(payload.account),
        },
      };
    }

    case DM_MESSAGE_DELETED: {
      const roomId = action.roomId as string | undefined;
      const messageId = action.messageId as string | undefined;
      const payload = action.payload as
        | { dm_chat_room_uuid?: string; message_id?: string }
        | undefined;

      const resolvedRoomId = roomId ?? payload?.dm_chat_room_uuid;
      const resolvedMessageId = messageId ?? payload?.message_id;

      if (!resolvedRoomId || !resolvedMessageId) return state;

      const existing = state.messages[resolvedRoomId];
      if (!existing) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [resolvedRoomId]: {
            ...existing,
            items: existing.items.filter((m) => m.id !== resolvedMessageId),
          },
        },
      };
    }

    case DM_CHAT_ROOM_UPDATED: {
      const roomData = (action.chatRoom ?? action.payload) as
        | ApiDmChatRoomJSON
        | undefined;
      if (!roomData) return state;

      const room = normalizeChatRoom(roomData);
      const newItems = { ...state.chatRooms.items, [room.uuid]: room };
      const newIds = state.chatRooms.orderedIds.includes(room.uuid)
        ? state.chatRooms.orderedIds
        : [room.uuid, ...state.chatRooms.orderedIds];

      const newAccounts: Record<string, DmChatRoomParticipant> = {
        ...state.accounts,
      };
      for (const participant of roomData.participants) {
        newAccounts[participant.id] = normalizeAccount(participant);
      }

      return {
        ...state,
        chatRooms: { ...state.chatRooms, items: newItems, orderedIds: newIds },
        idToUuid: { ...state.idToUuid, [room.id]: room.uuid },
        accounts: newAccounts,
      };
    }

    case DM_CHAT_ROOM_READ: {
      const roomId = action.roomId as string;
      const room = state.chatRooms.items[roomId];
      if (!room) return state;

      const shouldDecrement = room.unread;

      return {
        ...state,
        chatRooms: {
          ...state.chatRooms,
          items: {
            ...state.chatRooms.items,
            [roomId]: { ...room, unread: false },
          },
        },
        unreadCount: shouldDecrement
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }

    case DM_UNREAD_COUNT_FETCH_SUCCESS:
      return {
        ...state,
        unreadCount: action.count as number,
      };

    case DM_SET_ACTIVE_ROOM:
      return {
        ...state,
        activeRoomId: action.roomId as string | null,
      };

    case DM_MESSAGE_SEND_OPTIMISTIC: {
      const roomId = action.roomId as string;
      const tempId = action.tempId as string;
      const content = action.content as string;
      const accountId = action.accountId as string;
      const existing = getMessagesState(state.messages, roomId);

      // HTML-escape user content to prevent XSS in the optimistic rendering
      // path. The server-side path escapes via ERB::Util.html_escape; this is
      // the client-side equivalent for the window before server response.
      const escapedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const optimisticMessage: DmMessage = {
        id: tempId,
        dm_chat_room_uuid: roomId,
        account_id: accountId,
        content: `<p>${escapedContent}</p>`,
        content_plain: content,
        in_reply_to_id: null,
        attachments: [],
        emojis: [],
        created_at: new Date().toISOString(),
        language: null,
        pending: true,
        tempId,
      };

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: {
            ...existing,
            items: [...existing.items, optimisticMessage],
          },
        },
      };
    }

    case DM_MESSAGE_SEND_FAIL: {
      const roomId = action.roomId as string;
      const tempId = action.tempId as string;
      const existing = getMessagesState(state.messages, roomId);

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: {
            ...existing,
            items: existing.items.map((m) =>
              m.tempId === tempId ? { ...m, pending: false, failed: true } : m,
            ),
          },
        },
      };
    }

    case DM_UNREAD_COUNT_INCREMENT:
      return {
        ...state,
        unreadCount: state.unreadCount + 1,
      };

    case DM_MESSAGE_REMOVE_FAILED: {
      const roomId = action.roomId as string;
      const tempId = action.tempId as string | undefined;
      const existing = getMessagesState(state.messages, roomId);

      if (!tempId) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [roomId]: {
            ...existing,
            items: existing.items.filter((m) => m.tempId !== tempId),
          },
        },
      };
    }

    case DM_MIGRATION_IN_PROGRESS:
      return {
        ...state,
        migrationInProgress: true,
      };

    case DM_MIGRATION_COMPLETE:
      return {
        ...state,
        migrationInProgress: false,
      };

    case DM_READ_RECEIPT_RECEIVED: {
      const { chat_room_uuid, account_id, last_read_message_id } =
        action.payload as {
          chat_room_uuid: string;
          account_id: string;
          last_read_message_id: string;
        };
      const room = state.chatRooms.items[chat_room_uuid];
      if (!room) return state;
      return {
        ...state,
        chatRooms: {
          ...state.chatRooms,
          items: {
            ...state.chatRooms.items,
            [chat_room_uuid]: {
              ...room,
              readReceipts: {
                ...room.readReceipts,
                [account_id]: last_read_message_id,
              },
            },
          },
        },
      };
    }

    case DM_CHAT_ROOM_LEFT: {
      const roomUuid = action.roomUuid as string;
      const { [roomUuid]: _, ...remainingItems } = state.chatRooms.items;
      const { [roomUuid]: __, ...remainingMessages } = state.messages;
      return {
        ...state,
        chatRooms: {
          ...state.chatRooms,
          items: remainingItems,
          orderedIds: state.chatRooms.orderedIds.filter(
            (id) => id !== roomUuid,
          ),
        },
        messages: remainingMessages,
      };
    }

    default:
      return state;
  }
}
