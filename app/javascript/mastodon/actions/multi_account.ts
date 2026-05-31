import type { AppDispatch, GetState } from '../store';
import type {
  EncryptedPayload,
  MultiAccountEntry,
} from '../types/multi_account';
import {
  decryptToken,
  encryptToken,
} from '../utils/multi_account_crypto';
import {
  deleteEncryptedToken,
  loadEncryptedToken,
  saveEncryptedToken,
  loadAllEntries,
} from '../utils/multi_account_db';
import {
  clearActiveAccountIdIfMatches,
  getActiveAccountIdFromStorage,
  setActiveAccountIdInStorage,
} from '../utils/multi_account_storage';

interface ImmutableLike {
  getIn?: (path: string[]) => unknown;
  get?: (key: string) => unknown;
  has?: (key: string) => boolean;
  toJS?: () => unknown;
}


// Action types
export const MULTI_ACCOUNT_HYDRATE = 'MULTI_ACCOUNT_HYDRATE';
export const MULTI_ACCOUNT_REGISTER = 'MULTI_ACCOUNT_REGISTER';
export const MULTI_ACCOUNT_SWITCH = 'MULTI_ACCOUNT_SWITCH';
export const MULTI_ACCOUNT_REMOVE = 'MULTI_ACCOUNT_REMOVE';
export const MULTI_ACCOUNT_TOUCH = 'MULTI_ACCOUNT_TOUCH';
export const MULTI_ACCOUNT_SET_ACTIVE_ACCOUNT_META =
  'MULTI_ACCOUNT_SET_ACTIVE_ACCOUNT_META';

// Action creators
export const hydrateMultiAccountAction = (payload: {
  activeAccountId: string | null;
  accounts: Record<string, MultiAccountEntry>;
}) => ({
  type: MULTI_ACCOUNT_HYDRATE,
  payload,
});

export const registerAccountAction = (payload: MultiAccountEntry) => ({
  type: MULTI_ACCOUNT_REGISTER,
  payload,
});

export const switchAccountAction = (accountId: string) => ({
  type: MULTI_ACCOUNT_SWITCH,
  payload: { accountId },
});

export const removeAccountAction = (accountId: string) => ({
  type: MULTI_ACCOUNT_REMOVE,
  payload: { accountId },
});

export const touchAccountAction = (accountId: string) => ({
  type: MULTI_ACCOUNT_TOUCH,
  payload: { accountId },
});

export const setActiveAccountMeta = (accountId: string) => ({
  type: MULTI_ACCOUNT_SET_ACTIVE_ACCOUNT_META,
  payload: { accountId },
});

// Thunks
export const hydrateMultiAccount =
  () => async (dispatch: AppDispatch, getState: GetState) => {
    try {
      const storedEntries = await loadAllEntries();
      const entryIds = Object.keys(storedEntries);

      const state = getState() as unknown as ImmutableLike;
      const existingActive =
        (state.getIn?.(['multiAccount', 'activeAccountId']) as string | null) ??
        null;
      const storedActiveId = getActiveAccountIdFromStorage();

      let activeAccountId: string | null = null;

      if (storedActiveId && entryIds.includes(storedActiveId)) {
        activeAccountId = storedActiveId;
      } else {
        if (storedActiveId) {
          clearActiveAccountIdIfMatches(storedActiveId);
        }

        if (existingActive && entryIds.includes(existingActive)) {
          activeAccountId = existingActive;
        } else if (entryIds.length > 0) {
          const sorted = entryIds
            .map((id) => storedEntries[id])
            .filter((entry): entry is MultiAccountEntry => !!entry?.lastUsedAt)
            .sort(
              (a, b) =>
                new Date(b.lastUsedAt).getTime() -
                new Date(a.lastUsedAt).getTime(),
            );
          activeAccountId = sorted[0]?.id ?? entryIds[0] ?? null;
        }
      }

      dispatch(
        hydrateMultiAccountAction({
          activeAccountId,
          accounts: storedEntries,
        }),
      );
    } catch (error: unknown) {
      console.error('Failed to hydrate multi-account state:', error);
    }
  };

export const registerAccount =
  (entry: MultiAccountEntry, token: string) =>
  async (dispatch: AppDispatch) => {
    try {
      const lastUsedAt = new Date().toISOString();
      const entryWithTimestamp = {
        ...entry,
        lastUsedAt,
      };

      // Encrypt and save the token
      const encryptedPayload = await encryptToken(token);
      await saveEncryptedToken(entry.id, encryptedPayload, entryWithTimestamp);

      // Register the account in Redux
      dispatch(registerAccountAction(entryWithTimestamp));
    } catch (error: unknown) {
      console.error('Failed to register account:', error);
      throw error;
    }
  };

export const switchAccount =
  (accountId: string) => async (dispatch: AppDispatch, getState: GetState) => {
    try {
      const state = getState() as unknown as ImmutableLike;
      const accountsSource = state.getIn?.([
        'multiAccount',
        'accounts',
      ]) as ImmutableLike | null;
      if (!accountsSource) {
        throw new Error(`Account ${accountId} not found`);
      }

      const accountExists =
        typeof accountsSource.has === 'function'
          ? accountsSource.has(accountId)
          : Object.prototype.hasOwnProperty.call(accountsSource, accountId);

      if (!accountExists) {
        throw new Error(`Account ${accountId} not found`);
      }

      const { switchSession } = await import('../api/multi_accounts');

      const encryptedPayload = await loadEncryptedToken(accountId);
      if (!encryptedPayload) {
        throw new Error('Stored token not found. Please re-add the account.');
      }

      let token: string;
      try {
        token = await decryptToken(encryptedPayload);
      } catch {
        throw new Error(
          'Unable to decrypt stored account token. Please re-add the account.',
        );
      }

      // Call the switch endpoint which creates a proper session with SessionActivation
      const result = await switchSession(token);

      if (!result.success) {
        throw new Error('Failed to switch account session.');
      }

      // Update active account tracking
      setActiveAccountIdInStorage(accountId);
      dispatch(switchAccountAction(accountId));

      // Reload the page - the new session cookie will be used automatically
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[MultiAccount] Switch failed: ${errorMessage}`);
      throw error;
    }
  };

export const removeAccount =
  (accountId: string) => async (dispatch: AppDispatch) => {
    try {
      // Delete the encrypted token
      await deleteEncryptedToken(accountId);

      // Remove from Redux state
      dispatch(removeAccountAction(accountId));

      clearActiveAccountIdIfMatches(accountId);
    } catch (error: unknown) {
      console.error('Failed to remove account:', error);
      throw error;
    }
  };
