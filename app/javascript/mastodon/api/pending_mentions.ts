import api, { getLinks } from 'mastodon/api';
import type { ApiNotificationJSON } from 'mastodon/api_types/notifications';

export const apiFetchPendingMentions = async (params?: {
  max_id?: string;
  since_id?: string;
  min_id?: string;
  limit?: number;
}) => {
  const response = await api().request<ApiNotificationJSON[]>({
    method: 'GET',
    url: '/api/v1/pending_mentions',
    params,
  });

  return {
    notifications: response.data,
    links: getLinks(response),
  };
};

export const apiDismissPendingMention = async (id: string) => {
  await api().request({
    method: 'DELETE',
    url: `/api/v1/pending_mentions/${id}`,
  });
};
