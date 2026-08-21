import type React from 'react';
import { useState, useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { me } from 'mastodon/initial_state';
import type { DmChatRoom } from 'mastodon/reducers/dm';

import { RoomSettingsModal } from './room_settings_modal';

const messages = defineMessages({
  back: { id: 'dm.chat_room_header.back', defaultMessage: 'Back' },
  settings: {
    id: 'dm.chat_room_header.settings',
    defaultMessage: 'Room settings',
  },
  membersCount: {
    id: 'dm.chat_room_header.members_count',
    defaultMessage: '{count, plural, one {# member} other {# members}}',
  },
  roomFallback: {
    id: 'dm.chat_room_header.room_fallback',
    defaultMessage: 'Chat {id}',
  },
});

interface ChatRoomHeaderProps {
  room: DmChatRoom;
  onBack?: () => void;
}

const firstNonBlank = (
  ...values: (string | null | undefined)[]
): string | undefined =>
  values.find((value): value is string => Boolean(value?.trim()));

export const ChatRoomHeader: React.FC<ChatRoomHeaderProps> = ({
  room,
  onBack,
}) => {
  const intl = useIntl();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const otherParticipant = room.participants.find((p) => p.id !== me);
  const fallbackName = intl.formatMessage(messages.roomFallback, {
    id: room.id,
  });
  const roomName =
    room.room_type === 'direct'
      ? (firstNonBlank(
          otherParticipant?.display_name,
          otherParticipant?.username,
          room.title,
        ) ?? fallbackName)
      : (firstNonBlank(room.title) ?? fallbackName);
  const participantCount = room.participant_ids.length;
  const avatarUrl = firstNonBlank(
    otherParticipant?.avatar_static,
    room.participants[0]?.avatar_static,
  );

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  return (
    <div className='dm-chat-room-header'>
      <div className='dm-chat-room-header__left'>
        {onBack && (
          <button
            className='dm-chat-room-header__back-btn'
            type='button'
            title={intl.formatMessage(messages.back)}
            onClick={onBack}
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
              <path d='M19 12H5M12 19l-7-7 7-7' />
            </svg>
          </button>
        )}
        <div className='dm-chat-room-header__avatar'>
          {avatarUrl ? (
            <img
              className='dm-chat-room-header__avatar-img'
              src={avatarUrl}
              alt=''
              width='36'
              height='36'
            />
          ) : (
            <div className='dm-chat-room-header__avatar-placeholder' />
          )}
        </div>
        <div className='dm-chat-room-header__info'>
          <span className='dm-chat-room-header__name'>{roomName}</span>
          <span className='dm-chat-room-header__members'>
            {intl.formatMessage(messages.membersCount, {
              count: participantCount,
            })}
          </span>
        </div>
      </div>
      <div className='dm-chat-room-header__right'>
        <button
          className='dm-chat-room-header__settings-btn'
          type='button'
          title={intl.formatMessage(messages.settings)}
          onClick={handleOpenSettings}
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
            <circle cx='12' cy='12' r='3' />
            <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
          </svg>
        </button>
      </div>
      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        room={room}
      />
    </div>
  );
};
