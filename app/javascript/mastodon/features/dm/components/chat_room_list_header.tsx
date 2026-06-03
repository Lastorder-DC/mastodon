import type React from 'react';
import { useState, useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { NewChatRoomModal } from './new_chat_room_modal';

const messages = defineMessages({
  title: { id: 'dm.chat_room_list_header.title', defaultMessage: 'Messages' },
  newMessage: { id: 'dm.chat_room_list_header.new_message', defaultMessage: 'New message' },
  searchPlaceholder: { id: 'dm.chat_room_list_header.search_placeholder', defaultMessage: 'Search conversations...' },
});

export const ChatRoomListHeader: React.FC = () => {
  const intl = useIntl();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className='dm-chat-room-list-header'>
      <div className='dm-chat-room-list-header__top'>
        <h2 className='dm-chat-room-list-header__title'>{intl.formatMessage(messages.title)}</h2>
        <button
          className='dm-chat-room-list-header__new-btn'
          type='button'
          title={intl.formatMessage(messages.newMessage)}
          onClick={handleOpenModal}
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
            <path d='M12 20h9' />
            <path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' />
          </svg>
        </button>
      </div>
      <div className='dm-chat-room-list-header__search'>
        <input
          type='text'
          className='dm-chat-room-list-header__search-input'
          placeholder={intl.formatMessage(messages.searchPlaceholder)}
          readOnly
        />
      </div>
      <NewChatRoomModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};
