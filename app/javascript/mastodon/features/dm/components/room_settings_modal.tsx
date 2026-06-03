import type React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';

import { defineMessages, useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { apiGetSearch } from 'mastodon/api/search';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import type { ApiDmChatRoomJSON } from 'mastodon/api_types/dm';
import { me } from 'mastodon/initial_state';
import type { DmChatRoom } from 'mastodon/reducers/dm';
import { useAppDispatch } from 'mastodon/store';

import {
  createChatRoom,
  updateChatRoom,
  addChatRoomMembers,
  leaveChatRoom,
} from '../../../actions/dm';

const messages = defineMessages({
  title: { id: 'dm.room_settings.title', defaultMessage: 'Room Settings' },
  close: { id: 'dm.room_settings.close', defaultMessage: 'Close' },
  roomName: { id: 'dm.room_settings.room_name', defaultMessage: 'Room name' },
  roomNamePlaceholder: {
    id: 'dm.room_settings.room_name_placeholder',
    defaultMessage: 'Enter room name...',
  },
  save: { id: 'dm.room_settings.save', defaultMessage: 'Save' },
  members: { id: 'dm.room_settings.members', defaultMessage: 'Members' },
  addMember: {
    id: 'dm.room_settings.add_member',
    defaultMessage: 'Add member',
  },
  addMemberPlaceholder: {
    id: 'dm.room_settings.add_member_placeholder',
    defaultMessage: 'Search people to add...',
  },
  addingCreatesNewRoom: {
    id: 'dm.room_settings.adding_creates_new_room',
    defaultMessage: 'Adding a member will create a new group chat',
  },
  leave: {
    id: 'dm.room_settings.leave',
    defaultMessage: 'Leave conversation',
  },
  leaveConfirm: {
    id: 'dm.room_settings.leave_confirm',
    defaultMessage: 'Are you sure you want to leave this conversation?',
  },
});

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: DmChatRoom;
}

const RoomSettingsModalContent: React.FC<{
  onClose: () => void;
  room: DmChatRoom;
}> = ({ onClose, room }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const history = useHistory();
  const [roomTitle, setRoomTitle] = useState(room.title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ApiAccountJSON[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isGroupChat = room.room_type === 'group_chat';

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
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void apiGetSearch({ q: searchTerm, type: 'accounts', limit: 5 }).then(
        (results) => {
          setSearchResults(
            results.accounts.filter(
              (account) =>
                account.id !== me &&
                !account.acct.includes('@') &&
                !room.participant_ids.includes(account.id),
            ),
          );
        },
      );
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, room.participant_ids]);

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

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRoomTitle(e.target.value);
    },
    [],
  );

  const handleSaveTitle = useCallback(() => {
    if (!roomTitle.trim() || isSaving) return;

    setIsSaving(true);
    void (
      dispatch(
        updateChatRoom(room.uuid, { title: roomTitle.trim() }),
      ) as unknown as Promise<ApiDmChatRoomJSON>
    )
      .then(() => {
        setIsSaving(false);
      })
      .catch(() => {
        setIsSaving(false);
      });
  }, [roomTitle, isSaving, dispatch, room.uuid]);

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

  const handleAddMember = useCallback(
    (account: ApiAccountJSON) => {
      if (isGroupChat) {
        void (
          dispatch(
            addChatRoomMembers(room.uuid, { account_ids: [account.id] }),
          ) as unknown as Promise<ApiDmChatRoomJSON>
        ).then(() => {
          setSearchTerm('');
          setSearchResults([]);
          onClose();
        });
      } else {
        // Filter out current user since CreateDmChatRoomService adds the caller as owner
        const otherParticipantIds = room.participant_ids.filter(id => id !== me);
        const accountIds = [...otherParticipantIds, account.id];
        void (
          dispatch(
            createChatRoom({ account_ids: accountIds }),
          ) as unknown as Promise<{ id: string; uuid: string }>
        ).then((data) => {
          onClose();
          history.push(`/conversations/${data.uuid}`);
        });
      }
    },
    [isGroupChat, dispatch, room.uuid, room.participant_ids, onClose, history],
  );

  const handleLeave = useCallback(() => {
    if (window.confirm(intl.formatMessage(messages.leaveConfirm))) {
      void (dispatch(leaveChatRoom(room.uuid)) as unknown as Promise<void>).then(() => {
        onClose();
        history.push('/conversations');
      });
    }
  }, [dispatch, room.uuid, onClose, history, intl]);

  return (
    <div
      className='dm-room-settings-modal'
      onClick={handleBackdropClick}
      role='presentation'
    >
      <div className='dm-room-settings-modal__content' ref={contentRef}>
        <div className='dm-room-settings-modal__header'>
          <h2 className='dm-room-settings-modal__title'>
            {intl.formatMessage(messages.title)}
          </h2>
          <button
            className='dm-room-settings-modal__close-btn'
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

        {isGroupChat && (
          <div className='dm-room-settings-modal__section'>
            <div className='dm-room-settings-modal__section-title'>
              {intl.formatMessage(messages.roomName)}
            </div>
            <div className='dm-room-settings-modal__name-row'>
              <input
                className='dm-room-settings-modal__name-input'
                type='text'
                value={roomTitle}
                onChange={handleTitleChange}
                placeholder={intl.formatMessage(messages.roomNamePlaceholder)}
              />
              <button
                className='dm-room-settings-modal__save-btn'
                type='button'
                onClick={handleSaveTitle}
                disabled={!roomTitle.trim() || isSaving}
              >
                {intl.formatMessage(messages.save)}
              </button>
            </div>
          </div>
        )}

        <div className='dm-room-settings-modal__section'>
          <div className='dm-room-settings-modal__section-title'>
            {intl.formatMessage(messages.members)}
          </div>
          <div className='dm-room-settings-modal__member-list'>
            {room.participants.map((participant) => (
              <div
                key={participant.id}
                className='dm-room-settings-modal__member-item'
              >
                {participant.avatar_static ? (
                  <img
                    className='dm-room-settings-modal__member-avatar'
                    src={participant.avatar_static}
                    alt=''
                    width='36'
                    height='36'
                  />
                ) : (
                  <div className='dm-room-settings-modal__member-avatar-placeholder' />
                )}
                <div className='dm-room-settings-modal__member-info'>
                  <span className='dm-room-settings-modal__member-name'>
                    {participant.display_name || participant.username}
                  </span>
                  <span className='dm-room-settings-modal__member-handle'>
                    @{participant.acct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='dm-room-settings-modal__section'>
          <div className='dm-room-settings-modal__section-title'>
            {intl.formatMessage(messages.addMember)}
          </div>
          <div className='dm-room-settings-modal__add-section'>
            <input
              className='dm-room-settings-modal__add-input'
              type='text'
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder={intl.formatMessage(messages.addMemberPlaceholder)}
            />
            {!isGroupChat && (
              <div className='dm-room-settings-modal__note'>
                {intl.formatMessage(messages.addingCreatesNewRoom)}
              </div>
            )}
            {searchResults.length > 0 && (
              <div className='dm-room-settings-modal__add-results'>
                {searchResults.map((account) => (
                  <button
                    key={account.id}
                    className='dm-room-settings-modal__add-result-item'
                    type='button'
                    onClick={() => handleAddMember(account)}
                  >
                    <img
                      className='dm-room-settings-modal__add-result-avatar'
                      src={account.avatar_static}
                      alt=''
                      width='32'
                      height='32'
                    />
                    <div className='dm-room-settings-modal__add-result-info'>
                      <span className='dm-room-settings-modal__add-result-name'>
                        {account.display_name || account.username}
                      </span>
                      <span className='dm-room-settings-modal__add-result-handle'>
                        @{account.acct}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='dm-room-settings-modal__leave-section'>
          <button
            className='dm-room-settings-modal__leave-btn'
            type='button'
            onClick={handleLeave}
          >
            {intl.formatMessage(messages.leave)}
          </button>
        </div>
      </div>
    </div>
  );
};

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  room,
}) => {
  if (!isOpen) {
    return null;
  }

  return <RoomSettingsModalContent onClose={onClose} room={room} />;
};
