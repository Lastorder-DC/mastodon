import api, {
  apiRequestGet,
  apiRequestPost,
  apiRequestDelete,
  apiRequestPatch,
} from 'mastodon/api';
import type {
  ApiDmChatRoomJSON,
  ApiDmMessageJSON,
  ApiDmUnreadCountJSON,
} from 'mastodon/api_types/dm';

export const apiFetchDmChatRooms = (params?: {
  max_id?: string;
  since_id?: string;
  min_id?: string;
  limit?: number;
}) => apiRequestGet<ApiDmChatRoomJSON[]>('v1/dm/chat_rooms', { ...params });

export const apiFetchDmChatRoomsWithHeaders = async (params?: {
  max_id?: string;
  since_id?: string;
  min_id?: string;
  limit?: number;
}): Promise<{
  data: ApiDmChatRoomJSON[];
  migrationInProgress: boolean;
}> => {
  const response = await api().request<ApiDmChatRoomJSON[]>({
    method: 'GET',
    url: '/api/v1/dm/chat_rooms',
    params,
  });

  const migrationHeader = response.headers['x-dm-migration-status'] as
    | string
    | undefined;

  return {
    data: response.data,
    migrationInProgress: migrationHeader === 'in_progress',
  };
};

export const apiFetchDmChatRoom = (id: string) =>
  apiRequestGet<ApiDmChatRoomJSON>(`v1/dm/chat_rooms/${id}`);

export const apiCreateDmChatRoom = (params: {
  account_ids: string[];
  title?: string;
}) => apiRequestPost<ApiDmChatRoomJSON>('v1/dm/chat_rooms', { ...params });

export const apiUpdateDmChatRoom = (id: string, params: { title: string }) =>
  apiRequestPatch<ApiDmChatRoomJSON>(`v1/dm/chat_rooms/${id}`, { ...params });

export const apiDeleteDmChatRoom = (id: string) =>
  apiRequestDelete(`v1/dm/chat_rooms/${id}`);

export const apiFetchDmMessages = (
  roomId: string,
  params?: {
    max_id?: string;
    since_id?: string;
    min_id?: string;
    limit?: number;
  },
) =>
  apiRequestGet<ApiDmMessageJSON[]>(`v1/dm/chat_rooms/${roomId}/messages`, {
    ...params,
  });

export const apiSendDmMessage = (
  roomId: string,
  params: {
    content: string;
    media_ids?: string[];
    in_reply_to_id?: string;
    language?: string;
  },
) =>
  apiRequestPost<ApiDmMessageJSON>(`v1/dm/chat_rooms/${roomId}/messages`, {
    ...params,
  });

export const apiDeleteDmMessage = (roomId: string, messageId: string) =>
  apiRequestDelete(`v1/dm/chat_rooms/${roomId}/messages/${messageId}`);

export const apiMarkDmChatRoomRead = (
  roomId: string,
  params?: { last_read_message_id?: string },
) => apiRequestPost(`v1/dm/chat_rooms/${roomId}/read`, { ...params });

export const apiAddDmChatRoomMembers = (
  roomId: string,
  params: { account_ids: string[] },
) => apiRequestPost(`v1/dm/chat_rooms/${roomId}/members`, { ...params });

export const apiRemoveDmChatRoomMember = (roomId: string, accountId: string) =>
  apiRequestDelete(`v1/dm/chat_rooms/${roomId}/members/${accountId}`);

export const apiAcceptDmChatRoom = (roomId: string) =>
  apiRequestPost<ApiDmChatRoomJSON>(`v1/dm/chat_rooms/${roomId}/accept`);

export const apiFetchDmUnreadCount = () =>
  apiRequestGet<ApiDmUnreadCountJSON>('v1/dm/unread_count');
