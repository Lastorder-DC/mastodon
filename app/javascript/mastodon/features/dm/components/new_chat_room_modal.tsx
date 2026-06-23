import type React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { apiGetSearch } from 'mastodon/api/search';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import { me } from 'mastodon/initial_state';
import { useAppDispatch } from 'mastodon/store';

import { createChatRoom } from '../../../actions/dm';

const messages = defineMessages({
  title: { id: 'dm.new_chat_modal.title', defaultMessage: 'New Message' },
  close: { id: 'dm.new_chat_modal.close', defaultMessage: 'Close' },
  toLabel: { id: 'dm.new_chat_modal.to_label', defaultMessage: 'To:' },
  searchPlaceholder: { id: 'dm.new_chat_modal.search_placeholder', defaultMessage: 'Search people...' },
  groupNamePlaceholder: { id: 'dm.new_chat_modal.group_name_placeholder', defaultMessage: 'Group name (optional)' },
  startConversation: { id: 'dm.new_chat_modal.start_conversation', defaultMessage: 'Start conversation' },
  removeUser: { id: 'dm.new_chat_modal.remove_user', defaultMessage: 'Remove {name}' },
});

interface NewChatRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TagChip: React.FC<{
  user: ApiAccountJSON;
  onRemove: (id: string) => void;
}> = ({ user, onRemove }) => {
  const intl = useIntl();
  const handleClick = useCallback(() => {
    onRemove(user.id);
  }, [onRemove, user.id]);

  const displayName = user.display_name || user.username;

  return (
    <span className='dm-new-chat-modal__tag'>
      <span className='dm-new-chat-modal__tag-name'>
        {displayName}
      </span>
      <button
        className='dm-new-chat-modal__tag-remove'
        type='button'
        onClick={handleClick}
        aria-label={intl.formatMessage(messages.removeUser, { name: displayName })}
      >
        &times;
      </button>
    </span>
  );
};

const ResultItem: React.FC<{
  account: ApiAccountJSON;
  onSelect: (account: ApiAccountJSON) => void;
}> = ({ account, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(account);
  }, [onSelect, account]);

  return (
    <button
      className='dm-new-chat-modal__result-item'
      type='button'
      onClick={handleClick}
    >
      <img
        className='dm-new-chat-modal__result-avatar'
        src={account.avatar_static}
        alt=''
        width='36'
        height='36'
      />
      <div className='dm-new-chat-modal__result-info'>
        <span className='dm-new-chat-modal__result-name'>
          {account.display_name || account.username}
        </span>
        <span className='dm-new-chat-modal__result-handle'>
          @{account.acct}
        </span>
      </div>
    </button>
  );
};

const NewChatRoomModalContent: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ApiAccountJSON[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ApiAccountJSON[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.trim().length === 0) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void apiGetSearch({ q: searchTerm, type: 'accounts', limit: 5 }).then(
        (results) => {
          setSearchResults(() => {
            return results.accounts.filter(
              (account) =>
                account.id !== me &&
                !account.acct.includes('@') &&
                !selectedUsers.some((selected) => selected.id === account.id),
            );
          });
        },
      );
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, selectedUsers]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSelectUser = useCallback((account: ApiAccountJSON) => {
    setSelectedUsers((prev) => [...prev, account]);
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  const handleRemoveUser = useCallback((accountId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== accountId));
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      if (value.trim().length === 0) {
        setSearchResults([]);
      }
    },
    [],
  );

  const handleGroupNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGroupName(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (selectedUsers.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const accountIds = selectedUsers.map((u) => u.id);
    const title =
      selectedUsers.length >= 2 && groupName.trim()
        ? groupName.trim()
        : undefined;

    void (
      dispatch(
        createChatRoom({ account_ids: accountIds, title }),
      ) as unknown as Promise<{ id: string; uuid: string }>
    )
      .then((data) => {
        onClose();
        history.push(`/direct_message/${data.uuid}`);
      })
      .catch(() => {
        setIsSubmitting(false);
      });
  }, [selectedUsers, isSubmitting, groupName, dispatch, onClose, history]);

  return (
    <div
      className='dm-new-chat-modal'
      onClick={handleBackdropClick}
      role='presentation'
    >
      <div className='dm-new-chat-modal__content' ref={contentRef}>
        <div className='dm-new-chat-modal__header'>
          <h2 className='dm-new-chat-modal__title'>{intl.formatMessage(messages.title)}</h2>
          <button
            className='dm-new-chat-modal__close-btn'
            type='button'
            onClick={onClose}
            aria-label={intl.formatMessage(messages.close)}
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='18' y1='6' x2='6' y2='18' />
              <line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <div className='dm-new-chat-modal__search-area'>
          {selectedUsers.length > 0 && (
            <div className='dm-new-chat-modal__tags'>
              {selectedUsers.map((user) => (
                <TagChip
                  key={user.id}
                  user={user}
                  onRemove={handleRemoveUser}
                />
              ))}
            </div>
          )}
          <div className='dm-new-chat-modal__input-row'>
            <span className='dm-new-chat-modal__input-label'>{intl.formatMessage(messages.toLabel)}</span>
            <input
              className='dm-new-chat-modal__search-input'
              type='text'
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={intl.formatMessage(messages.searchPlaceholder)}
            />
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className='dm-new-chat-modal__results'>
            {searchResults.map((account) => (
              <ResultItem
                key={account.id}
                account={account}
                onSelect={handleSelectUser}
              />
            ))}
          </div>
        )}

        {selectedUsers.length >= 2 && (
          <div className='dm-new-chat-modal__group-name-input'>
            <input
              type='text'
              value={groupName}
              onChange={handleGroupNameChange}
              placeholder={intl.formatMessage(messages.groupNamePlaceholder)}
              className='dm-new-chat-modal__group-input'
            />
          </div>
        )}

        <div className='dm-new-chat-modal__footer'>
          <button
            className='dm-new-chat-modal__submit-btn'
            type='button'
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || isSubmitting}
          >
            {intl.formatMessage(messages.startConversation)}
          </button>
        </div>
      </div>
    </div>
  );
};

export const NewChatRoomModal: React.FC<NewChatRoomModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return <NewChatRoomModalContent onClose={onClose} />;
};
