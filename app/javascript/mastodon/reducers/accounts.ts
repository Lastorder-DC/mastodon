import type { Reducer } from '@reduxjs/toolkit';
import { Map as ImmutableMap } from 'immutable';

import {
  followAccountSuccess,
  unfollowAccountSuccess,
  revealAccount,
} from 'mastodon/actions/accounts_typed';
import { importAccounts } from 'mastodon/actions/importer/accounts';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import { me } from 'mastodon/initial_state';
import type { Account } from 'mastodon/models/account';
import { createAccountFromServerJSON } from 'mastodon/models/account';

const initialState = ImmutableMap<string, Account>();

const normalizeAccount = (
  state: typeof initialState,
  account: ApiAccountJSON,
) => {
  const existing = state.get(account.id);
  const newAccount = createAccountFromServerJSON(account);

  // Preserve owner-only fields (custom logo/background) when not in the API response.
  // These fields are only serialized for the account owner; other API responses
  // (timelines, notifications) omit them, which would overwrite with empty defaults.
  const finalAccount =
    existing && account.custom_logo === undefined
      ? newAccount
          .set('custom_logo', existing.custom_logo)
          .set('custom_logo_static', existing.custom_logo_static)
          .set(
            'custom_logo_description',
            existing.custom_logo_description,
          )
          .set('custom_logo_enabled', existing.custom_logo_enabled)
          .set('background_image', existing.background_image)
          .set('background_image_static', existing.background_image_static)
          .set('background_image_enabled', existing.background_image_enabled)
      : newAccount;

  return state.set(
    account.id,
    finalAccount.set(
      'hidden',
      state.get(account.id)?.hidden === false
        ? false
        : account.limited || false,
    ),
  );
};

const normalizeAccounts = (
  state: typeof initialState,
  accounts: ApiAccountJSON[],
) => {
  accounts.forEach((account) => {
    state = normalizeAccount(state, account);
  });

  return state;
};

function getCurrentUser() {
  if (!me)
    throw new Error(
      'No current user (me) defined when calling `accountsReducer`',
    );

  return me;
}

export const accountsReducer: Reducer<typeof initialState> = (
  state = initialState,
  action,
) => {
  if (revealAccount.match(action))
    return state.setIn([action.payload.id, 'hidden'], false);
  else if (importAccounts.match(action))
    return normalizeAccounts(state, action.payload.accounts);
  else if (
    followAccountSuccess.match(action) &&
    !action.payload.alreadyFollowing
  ) {
    return state
      .update(action.payload.relationship.id, (account) =>
        account?.update('followers_count', (n) => n + 1),
      )
      .update(getCurrentUser(), (account) =>
        account?.update('following_count', (n) => n + 1),
      );
  } else if (unfollowAccountSuccess.match(action))
    return state
      .update(action.payload.relationship.id, (account) =>
        account?.update('followers_count', (n) => Math.max(0, n - 1)),
      )
      .update(getCurrentUser(), (account) =>
        account?.update('following_count', (n) => Math.max(0, n - 1)),
      );
  else return state;
};
