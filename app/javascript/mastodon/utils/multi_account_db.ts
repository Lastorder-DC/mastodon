import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';

import { currentAuthorizationToken } from 'mastodon/api';

import type {
  EncryptedPayload,
  MultiAccountEntry,
} from '../types/multi_account';

const DB_NAME = 'multiAccountStore';
const STORE_NAME = 'accounts';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase | null = null;

/**
 * Open the multi-account database
 */
export const openMultiAccountDB = async (): Promise<IDBPDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to open IndexedDB:', error);

    if (error instanceof Error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear browser cache.');
      } else if (error.name === 'SecurityError') {
        throw new Error(
          'IndexedDB access denied. Not available in private browsing mode.',
        );
      } else if (error.name === 'VersionError') {
        throw new Error('Database version error. Please refresh the page.');
      }
    }

    throw new Error('Unable to store account information.');
  }
};

export interface StoredAccountRecord {
  token: EncryptedPayload;
  entry?: MultiAccountEntry;
  credentials?: EncryptedPayload;
}

const isStoredAccountRecord = (
  value: unknown,
): value is StoredAccountRecord => {
  return typeof value === 'object' && value !== null && 'token' in value;
};

const normalizeRecord = (value: unknown): StoredAccountRecord | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (isStoredAccountRecord(value)) {
    return value;
  }

  return {
    token: value as EncryptedPayload,
  };
};

/**
 * Save encrypted token (and metadata) for an account
 */
export const saveEncryptedToken = async (
  accountId: string,
  payload: EncryptedPayload,
  entry: MultiAccountEntry,
): Promise<void> => {
  try {
    const db = await openMultiAccountDB();
    const record: StoredAccountRecord = {
      token: payload,
      entry,
    };
    await db.put(STORE_NAME, record, accountId);
  } catch (error) {
    console.error(
      `Failed to save encrypted token for account ${accountId}:`,
      error,
    );

    if (error instanceof Error && error.message.includes('Storage quota')) {
      throw error;
    }

    throw new Error('Unable to save account token.');
  }
};

/**
 * Load encrypted token for an account
 */
export const loadEncryptedToken = async (
  accountId: string,
): Promise<EncryptedPayload | null> => {
  try {
    const db = await openMultiAccountDB();
    const stored: unknown = await db.get(STORE_NAME, accountId);

    if (!stored) {
      return null;
    }

    if (isStoredAccountRecord(stored)) {
      return stored.token;
    }

    return stored as EncryptedPayload;
  } catch (error) {
    console.error(
      `Failed to load encrypted token for account ${accountId}:`,
      error,
    );
    return null;
  }
};

/**
 * Delete encrypted token for an account
 */
export const deleteEncryptedToken = async (
  accountId: string,
): Promise<void> => {
  try {
    const db = await openMultiAccountDB();
    await db.delete(STORE_NAME, accountId);
  } catch (error) {
    console.error(
      `Failed to delete encrypted token for account ${accountId}:`,
      error,
    );
  }
};

/**
 * Load all account entries (without decrypted tokens)
 */
const fetchAccountMetadata = async (
  accountId: string,
): Promise<MultiAccountEntry | null> => {
  try {
    const token = currentAuthorizationToken();

    if (!token) {
      return null;
    }

    const response = await fetch(`/api/v1/accounts/${accountId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const account = (await response.json()) as Record<string, string>;

    return {
      id: account.id ?? '',
      acct: account.acct ?? account.username ?? '',
      displayName: account.display_name ?? account.username ?? '',
      avatar: account.avatar ?? account.avatar_static ?? '',
      encryptedTokenRef: '',
      lastUsedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      `Failed to fetch metadata for multi-account entry ${accountId}:`,
      error,
    );
    return null;
  }
};

export const loadAllEntries = async (): Promise<
  Record<string, MultiAccountEntry>
> => {
  try {
    const db = await openMultiAccountDB();
    const keys = await db.getAllKeys(STORE_NAME);
    const entries: Record<string, MultiAccountEntry> = {};
    const legacyRecords: {
      id: string;
      payload: EncryptedPayload;
    }[] = [];

    for (const key of keys) {
      const stored: unknown = await db.get(STORE_NAME, key);
      if (stored && typeof key === 'string') {
        const normalized = normalizeRecord(stored);
        if (normalized) {
          if (normalized.entry) {
            entries[key] = normalized.entry;
          } else {
            legacyRecords.push({
              id: key,
              payload: normalized.token,
            });
          }
        }
      }
    }

    if (legacyRecords.length > 0) {
      for (const record of legacyRecords) {
        try {
          const entry = await fetchAccountMetadata(record.id);
          if (!entry) {
            continue;
          }

          entries[record.id] = entry;

          await db.put(
            STORE_NAME,
            {
              token: record.payload,
              entry,
            },
            record.id,
          );
        } catch (error) {
          console.error(
            `Failed to upgrade multi-account entry for account ${record.id}:`,
            error,
          );
        }
      }
    }

    return entries;
  } catch (error) {
    console.error('Failed to load all account entries:', error);
    return {};
  }
};

/**
 * Clear all stored account data
 */
export const clearAllAccounts = async (): Promise<void> => {
  try {
    const db = await openMultiAccountDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Failed to clear all accounts:', error);
  }
};
