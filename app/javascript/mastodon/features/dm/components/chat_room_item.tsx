import type React from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import { RelativeTimestamp } from 'mastodon/components/relative_timestamp';
import { me } from 'mastodon/initial_state';
import type { DmChatRoom } from 'mastodon/reducers/dm';

const messages = defineMessages({
  pending: { id: 'dm.invite.pending', defaultMessage: 'Conversation request' },
});

interface ChatRoomItemProps {
  room: DmChatRoom;
  active: boolean;
}

const firstNonBlank = (
  ...values: (string | null | undefined)[]
): string | undefined =>
  values.find((value): value is string => Boolean(value?.trim()));

export const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ room, active }) => {
  const intl = useIntl();
  const otherParticipant = room.participants.find((p) => p.id !== me);
  const isGroupChat = room.room_type === 'group_chat';
  const roomName = !isGroupChat
    ? (firstNonBlank(
        otherParticipant?.display_name,
        otherParticipant?.username,
        room.title,
      ) ?? `Chat ${room.id}`)
    : (firstNonBlank(room.title) ?? `Chat ${room.id}`);
  const lastMessagePreview = room.last_message?.content_plain ?? '';
  const lastMessageTime = room.last_message_at;
  const avatarUrl = firstNonBlank(
    otherParticipant?.avatar_static,
    room.participants[0]?.avatar_static,
  );

  return (
    <Link
      to={`/direct_message/${room.uuid}`}
      className={`dm-chat-room-item ${active ? 'dm-chat-room-item--active' : ''} ${room.unread ? 'dm-chat-room-item--unread' : ''} ${!room.accepted ? 'dm-chat-room-item--pending' : ''} ${isGroupChat ? 'dm-chat-room-item--group' : ''}`}
    >
      <div className='dm-chat-room-item__avatar'>
        {avatarUrl ? (
          <img
            className='dm-chat-room-item__avatar-img'
            src={avatarUrl}
            alt=''
            width='48'
            height='48'
          />
        ) : (
          <div className='dm-chat-room-item__avatar-placeholder' />
        )}
        {isGroupChat && (
          <span className='dm-chat-room-item__group-badge'>
            {room.participant_ids.length}
          </span>
        )}
      </div>
      <div className='dm-chat-room-item__content'>
        <div className='dm-chat-room-item__top'>
          <span className='dm-chat-room-item__name'>{roomName}</span>
          {!room.accepted && (
            <span className='dm-chat-room-item__pending-badge'>
              {intl.formatMessage(messages.pending)}
            </span>
          )}
          {lastMessageTime && (
            <span className='dm-chat-room-item__time'>
              <RelativeTimestamp timestamp={lastMessageTime} />
            </span>
          )}
        </div>
        <div className='dm-chat-room-item__bottom'>
          <span className='dm-chat-room-item__preview'>
            {lastMessagePreview}
          </span>
          {room.unread && <span className='dm-chat-room-item__unread-dot' />}
        </div>
      </div>
    </Link>
  );
};
