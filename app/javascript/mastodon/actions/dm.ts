import {
  apiFetchDmChatRoomsWithHeaders,
  apiFetchDmMessages,
  apiSendDmMessage,
  apiDeleteDmMessage,
  apiMarkDmChatRoomRead,
  apiFetchDmUnreadCount,
  apiCreateDmChatRoom,
  apiUpdateDmChatRoom,
  apiAddDmChatRoomMembers,
  apiDeleteDmChatRoom,
  apiAcceptDmChatRoom,
} from 'mastodon/api/dm';
import { me } from 'mastodon/initial_state';
import type { AppDispatch } from 'mastodon/store';

export const DM_CHAT_ROOMS_FETCH_REQUEST = 'DM_CHAT_ROOMS_FETCH_REQUEST';
export const DM_CHAT_ROOMS_FETCH_SUCCESS = 'DM_CHAT_ROOMS_FETCH_SUCCESS';
export const DM_CHAT_ROOMS_FETCH_FAIL = 'DM_CHAT_ROOMS_FETCH_FAIL';

export const DM_MESSAGES_FETCH_REQUEST = 'DM_MESSAGES_FETCH_REQUEST';
export const DM_MESSAGES_FETCH_SUCCESS = 'DM_MESSAGES_FETCH_SUCCESS';
export const DM_MESSAGES_FETCH_FAIL = 'DM_MESSAGES_FETCH_FAIL';

export const DM_MESSAGE_SEND_SUCCESS = 'DM_MESSAGE_SEND_SUCCESS';
export const DM_MESSAGE_SEND_OPTIMISTIC = 'DM_MESSAGE_SEND_OPTIMISTIC';
export const DM_MESSAGE_SEND_FAIL = 'DM_MESSAGE_SEND_FAIL';
export const DM_MESSAGE_RECEIVED = 'DM_MESSAGE_RECEIVED';
export const DM_MESSAGE_DELETED = 'DM_MESSAGE_DELETED';

export const DM_CHAT_ROOM_UPDATED = 'DM_CHAT_ROOM_UPDATED';
export const DM_CHAT_ROOM_READ = 'DM_CHAT_ROOM_READ';

export const DM_UNREAD_COUNT_FETCH_SUCCESS = 'DM_UNREAD_COUNT_FETCH_SUCCESS';
export const DM_UNREAD_COUNT_INCREMENT = 'DM_UNREAD_COUNT_INCREMENT';
export const DM_SET_ACTIVE_ROOM = 'DM_SET_ACTIVE_ROOM';
export const DM_MIGRATION_IN_PROGRESS = 'DM_MIGRATION_IN_PROGRESS';
export const DM_MIGRATION_COMPLETE = 'DM_MIGRATION_COMPLETE';
export const DM_MESSAGE_REMOVE_FAILED = 'DM_MESSAGE_REMOVE_FAILED';
export const DM_READ_RECEIPT_RECEIVED = 'DM_READ_RECEIPT_RECEIVED';
export const DM_CHAT_ROOM_LEFT = 'DM_CHAT_ROOM_LEFT';
export const DM_CHAT_ROOM_ACCEPTED = 'DM_CHAT_ROOM_ACCEPTED';

export const fetchChatRooms =
  (params?: {
    max_id?: string;
    since_id?: string;
    min_id?: string;
    limit?: number;
  }) =>
  (dispatch: AppDispatch) => {
    dispatch({ type: DM_CHAT_ROOMS_FETCH_REQUEST });

    apiFetchDmChatRoomsWithHeaders(params)
      .then(({ data, migrationInProgress }) => {
        dispatch({ type: DM_CHAT_ROOMS_FETCH_SUCCESS, chatRooms: data });

        if (migrationInProgress) {
          dispatch({ type: DM_MIGRATION_IN_PROGRESS });
        }

        return data;
      })
      .catch((error: unknown) => {
        dispatch({ type: DM_CHAT_ROOMS_FETCH_FAIL, error });
      });
  };

export const fetchMessages =
  (
    roomId: string,
    params?: {
      max_id?: string;
      since_id?: string;
      min_id?: string;
      limit?: number;
    },
  ) =>
  (dispatch: AppDispatch) => {
    dispatch({ type: DM_MESSAGES_FETCH_REQUEST, roomId });

    apiFetchDmMessages(roomId, params)
      .then((data) => {
        dispatch({ type: DM_MESSAGES_FETCH_SUCCESS, roomId, messages: data });
        return data;
      })
      .catch((error: unknown) => {
        dispatch({ type: DM_MESSAGES_FETCH_FAIL, roomId, error });
      });
  };

export const sendMessage =
  (
    roomId: string,
    params: {
      content: string;
      media_ids?: string[];
      in_reply_to_id?: string;
      language?: string;
    },
  ) =>
  (dispatch: AppDispatch) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    dispatch({
      type: DM_MESSAGE_SEND_OPTIMISTIC,
      roomId,
      tempId,
      content: params.content,
      accountId: me,
    });

    apiSendDmMessage(roomId, params)
      .then((data) => {
        dispatch({
          type: DM_MESSAGE_SEND_SUCCESS,
          roomId,
          message: data,
          tempId,
        });
        return data;
      })
      .catch(() => {
        dispatch({ type: DM_MESSAGE_SEND_FAIL, roomId, tempId });
      });
  };

export const deleteMessage =
  (roomId: string, messageId: string) => (dispatch: AppDispatch) => {
    apiDeleteDmMessage(roomId, messageId)
      .then(() => {
        dispatch({ type: DM_MESSAGE_DELETED, roomId, messageId });
      })
      .catch(() => {
        // Error handling can be expanded later
      });
  };

export const markAsRead = (roomId: string) => (dispatch: AppDispatch) => {
  dispatch({ type: DM_CHAT_ROOM_READ, roomId });
  apiMarkDmChatRoomRead(roomId)
    .then(() => {
      // The local DM_CHAT_ROOM_READ decrement above only fires if the room was
      // already loaded into state.chatRooms.items with unread: true (e.g. via
      // the room list fetch). Landing on a room directly - straight from a
      // notification, or before the list has loaded - skips that decrement
      // silently, leaving the sidebar badge stuck. Re-fetching the count from
      // the server (its cache is invalidated by the read endpoint) is
      // authoritative and fixes the badge regardless of what was loaded locally.
      dispatch(fetchUnreadCount());
    })
    .catch(() => {
      // Error handling can be expanded later
    });
};

export const fetchUnreadCount = () => (dispatch: AppDispatch) => {
  apiFetchDmUnreadCount()
    .then((data) => {
      dispatch({ type: DM_UNREAD_COUNT_FETCH_SUCCESS, count: data.count });
      return data;
    })
    .catch(() => {
      // Error handling can be expanded later
    });
};

export const createChatRoom =
  (params: { account_ids: string[]; title?: string }) =>
  (dispatch: AppDispatch) => {
    return apiCreateDmChatRoom(params).then((data) => {
      dispatch({ type: DM_CHAT_ROOM_UPDATED, chatRoom: data });
      return data;
    });
  };

export const setActiveRoom = (roomId: string | null) => ({
  type: DM_SET_ACTIVE_ROOM,
  roomId,
});

export const updateChatRoom =
  (roomId: string, params: { title: string }) => (dispatch: AppDispatch) => {
    return apiUpdateDmChatRoom(roomId, params).then((data) => {
      dispatch({ type: DM_CHAT_ROOM_UPDATED, chatRoom: data });
      return data;
    });
  };

export const addChatRoomMembers =
  (roomId: string, params: { account_ids: string[] }) =>
  (dispatch: AppDispatch) => {
    return apiAddDmChatRoomMembers(roomId, params).then((data) => {
      dispatch({ type: DM_CHAT_ROOM_UPDATED, chatRoom: data });
      return data;
    });
  };

export const leaveChatRoom = (roomUuid: string) => (dispatch: AppDispatch) => {
  return apiDeleteDmChatRoom(roomUuid).then(() => {
    dispatch({ type: DM_CHAT_ROOM_LEFT, roomUuid });
  });
};

export const acceptChatRoom = (roomUuid: string) => (dispatch: AppDispatch) => {
  return apiAcceptDmChatRoom(roomUuid).then((data) => {
    dispatch({ type: DM_CHAT_ROOM_UPDATED, chatRoom: data });
    return data;
  });
};

export const rejectChatRoom = (roomUuid: string) => (dispatch: AppDispatch) => {
  return apiDeleteDmChatRoom(roomUuid).then(() => {
    dispatch({ type: DM_CHAT_ROOM_LEFT, roomUuid });
  });
};
