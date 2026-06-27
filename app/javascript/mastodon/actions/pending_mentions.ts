import {
  apiFetchPendingMentions,
  apiDismissPendingMention,
} from 'mastodon/api/pending_mentions';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import type { ApiStatusJSON } from 'mastodon/api_types/statuses';
import { createDataLoadingThunk } from 'mastodon/store/typed_functions';

import { importFetchedAccounts, importFetchedStatuses } from './importer';

export const fetchPendingMentions = createDataLoadingThunk(
  'pendingMentions/fetch',
  async () => apiFetchPendingMentions(),
  ({ notifications, links }, { dispatch }) => {
    const accounts: ApiAccountJSON[] = [];
    const statuses: ApiStatusJSON[] = [];

    notifications.forEach((notification) => {
      accounts.push(notification.account);
      if ('status' in notification && notification.status) {
        statuses.push(notification.status);
      }
    });

    if (accounts.length > 0) dispatch(importFetchedAccounts(accounts));
    if (statuses.length > 0) dispatch(importFetchedStatuses(statuses));

    return {
      notifications,
      next: links.refs.find((link) => link.rel === 'next')?.uri ?? null,
    };
  },
);

export const fetchMorePendingMentions = createDataLoadingThunk(
  'pendingMentions/fetchMore',
  async (params: { url: string }) => {
    const maxIdMatch = /max_id=([^&]+)/.exec(params.url);
    const maxId = maxIdMatch ? maxIdMatch[1] : undefined;
    return apiFetchPendingMentions({ max_id: maxId });
  },
  ({ notifications, links }, { dispatch }) => {
    const accounts: ApiAccountJSON[] = [];
    const statuses: ApiStatusJSON[] = [];

    notifications.forEach((notification) => {
      accounts.push(notification.account);
      if ('status' in notification && notification.status) {
        statuses.push(notification.status);
      }
    });

    if (accounts.length > 0) dispatch(importFetchedAccounts(accounts));
    if (statuses.length > 0) dispatch(importFetchedStatuses(statuses));

    return {
      notifications,
      next: links.refs.find((link) => link.rel === 'next')?.uri ?? null,
    };
  },
);

export const dismissPendingMention = createDataLoadingThunk(
  'pendingMentions/dismiss',
  async (params: { id: string }) => {
    await apiDismissPendingMention(params.id);
    return params;
  },
  (result) => result,
);
