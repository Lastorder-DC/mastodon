import type React from 'react';

// ChatRoomListSkeleton - shows 5 placeholder items mimicking chat_room_item
export const ChatRoomListSkeleton: React.FC = () => {
  return (
    <div className='dm-skeleton-list'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='dm-skeleton-item'>
          <div className='dm-skeleton-avatar' />
          <div className='dm-skeleton-content'>
            <div className='dm-skeleton-line dm-skeleton-line--short' />
            <div className='dm-skeleton-line dm-skeleton-line--long' />
          </div>
        </div>
      ))}
    </div>
  );
};

// MessageListSkeleton - shows alternating left/right placeholder bubbles
export const MessageListSkeleton: React.FC = () => {
  return (
    <div className='dm-skeleton-messages'>
      {[false, true, true, false, false, true].map((isOwn, i) => (
        <div
          key={i}
          className={`dm-skeleton-message ${isOwn ? 'dm-skeleton-message--own' : 'dm-skeleton-message--other'}`}
        >
          {!isOwn && <div className='dm-skeleton-message-avatar' />}
          <div className='dm-skeleton-bubble' />
        </div>
      ))}
    </div>
  );
};
