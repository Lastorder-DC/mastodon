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

// @ts-expect-error - connectStream is untyped
export const connectDmStream = () =>
  // @ts-expect-error - connectStream callback types
  connectStream('dm', {}, (dispatch, getState) => {
    return {
      onConnect() {
        console.log('[DM Stream] onConnect - stream connected');
      },

      onDisconnect() {
        console.log('[DM Stream] onDisconnect - stream disconnected');
      },

      // @ts-expect-error - data is untyped StreamEvent
      onReceive(data) {
        console.log('[DM Stream] onReceive event:', data.event, 'payload type:', typeof data.payload);

        switch (data.event) {
          case 'dm_message': {
            const payload = typeof data.payload === 'string'
              ? JSON.parse(data.payload)
              : data.payload;

            console.log('[DM Stream] dm_message parsed payload:', { id: payload.id, dm_chat_room_uuid: payload.dm_chat_room_uuid, account_id: payload.account?.id });

            const state = getState();
            const activeRoomId = state.dm?.activeRoomId;
            const isActiveRoom = activeRoomId === payload.dm_chat_room_uuid;

            console.log('[DM Stream] activeRoomId:', activeRoomId, 'message room uuid:', payload.dm_chat_room_uuid, 'isActiveRoom:', isActiveRoom);

            dispatch({
              type: DM_MESSAGE_RECEIVED,
              payload,
              meta: { sound: 'boop' },
            });

            console.log('[DM Stream] dispatched DM_MESSAGE_RECEIVED');

            if (!isActiveRoom) {
              dispatch({ type: DM_UNREAD_COUNT_INCREMENT });

              // Browser notification
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                const account = payload.account;
                const senderName = account?.display_name || account?.username || 'DM';
                const body = payload.content_plain || '';
                const icon = account?.avatar_static || undefined;
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
            const deletePayload = typeof data.payload === 'string'
              ? JSON.parse(data.payload)
              : data.payload;
            dispatch({ type: DM_MESSAGE_DELETED, payload: deletePayload });
            break;
          }
          case 'dm_chat_room.update':
          case 'dm_chat_room.new': {
            const roomPayload = typeof data.payload === 'string'
              ? JSON.parse(data.payload)
              : data.payload;
            dispatch({ type: DM_CHAT_ROOM_UPDATED, payload: roomPayload });
            break;
          }
          case 'dm_read_receipt': {
            const readPayload = typeof data.payload === 'string'
              ? JSON.parse(data.payload)
              : data.payload;
            dispatch({ type: DM_READ_RECEIPT_RECEIVED, payload: readPayload });
            break;
          }
          case 'dm_migration_complete':
            dispatch({ type: DM_MIGRATION_COMPLETE });
            dispatch(fetchChatRooms());
            break;
          case 'dm_migration_notification':
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Mastodon', {
                body: 'DM 마이그레이션이 완료되었습니다.',
              });
            }
            break;
        }
      },
    };
  });
