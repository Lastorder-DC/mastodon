import type { StreamEvent } from '../stream';
import { connectStream } from '../stream';

import {
  DM_MESSAGE_RECEIVED,
  DM_MESSAGE_DELETED,
  DM_CHAT_ROOM_UPDATED,
  DM_UNREAD_COUNT_INCREMENT,
  DM_READ_RECEIPT_RECEIVED,
  DM_MIGRATION_COMPLETE,
  fetchChatRooms,
} from './dm';

interface DmMessagePayload {
  id: string;
  dm_chat_room_uuid: string;
  content_plain?: string;
  account?: {
    id: string;
    display_name?: string;
    username?: string;
    avatar_static?: string;
  };
}

export const connectDmStream = () =>
  connectStream('dm', {}, (dispatch, getState) => {
    return {
      onConnect() {
        // Stream connected
      },

      onDisconnect() {
        // Stream disconnected
      },

      onReceive(data: StreamEvent) {
        switch (data.event) {
          case 'dm_message': {
            const payload = (typeof data.payload === 'string'
              ? JSON.parse(data.payload)
              : data.payload) as unknown as DmMessagePayload;

            const state = getState();
            const activeRoomId = (
              state as { dm?: { activeRoomId?: string | null } }
            ).dm?.activeRoomId;
            const isActiveRoom = activeRoomId === payload.dm_chat_room_uuid;

            dispatch({
              type: DM_MESSAGE_RECEIVED,
              payload,
              meta: { sound: 'boop' },
            });

            if (!isActiveRoom) {
              dispatch({ type: DM_UNREAD_COUNT_INCREMENT });

              // Browser notification
              if (
                typeof Notification !== 'undefined' &&
                Notification.permission === 'granted'
              ) {
                const account = payload.account;
                const senderName =
                  account?.display_name ?? account?.username ?? 'DM';
                const body = payload.content_plain ?? '';
                const icon = account?.avatar_static ?? undefined;
                const roomUuid = payload.dm_chat_room_uuid;

                const notification = new Notification(senderName, {
                  body: body.slice(0, 140),
                  icon,
                  tag: `dm-${roomUuid}`,
                });

                notification.onclick = () => {
                  window.focus();
                  window.location.href = `/conversations/${roomUuid}`;
                  notification.close();
                };
              }
            }
            break;
          }
          case 'dm_message.delete': {
            const deletePayload =
              typeof data.payload === 'string'
                ? (JSON.parse(data.payload) as unknown)
                : data.payload;
            dispatch({ type: DM_MESSAGE_DELETED, payload: deletePayload });
            break;
          }
          case 'dm_chat_room.update':
          case 'dm_chat_room.new': {
            const roomPayload =
              typeof data.payload === 'string'
                ? (JSON.parse(data.payload) as unknown)
                : data.payload;
            dispatch({ type: DM_CHAT_ROOM_UPDATED, payload: roomPayload });
            break;
          }
          case 'dm_read_receipt': {
            const readPayload =
              typeof data.payload === 'string'
                ? (JSON.parse(data.payload) as unknown)
                : data.payload;
            dispatch({ type: DM_READ_RECEIPT_RECEIVED, payload: readPayload });
            break;
          }
          case 'dm_migration_complete':
            dispatch({ type: DM_MIGRATION_COMPLETE });
            dispatch(fetchChatRooms());
            break;
          case 'dm_migration_notification':
            if (
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted'
            ) {
              void new Notification('Mastodon', {
                body: 'DM 마이그레이션이 완료되었습니다.',
              });
            }
            break;
        }
      },
    };
  });
