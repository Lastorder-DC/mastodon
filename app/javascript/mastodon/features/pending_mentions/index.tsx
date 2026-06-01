import { useMemo } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { Helmet } from '@unhead/react/helmet';
import { isEqual } from 'lodash';

import ChatBubbleIcon from '@/material-icons/400-24px/chat_bubble.svg?react';
import { NotSignedInIndicator } from 'mastodon/components/not_signed_in_indicator';
import { useIdentity } from 'mastodon/identity_context';
import { selectPendingMentionGroups } from 'mastodon/selectors/notifications';
import { useAppSelector } from 'mastodon/store';

import { Column } from '../../components/column';
import { ColumnHeader } from '../../components/column_header';
import ScrollableList from '../../components/scrollable_list';
import { NotificationGroup } from '../notifications_v2/components/notification_group';

const messages = defineMessages({
  title: { id: 'column.pending_mentions', defaultMessage: 'Awaiting reply' },
});

export const PendingMentions: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const intl = useIntl();
  const { signedIn } = useIdentity();
  const notifications = useAppSelector(selectPendingMentionGroups, isEqual);

  const scrollableContent = useMemo(() => {
    if (notifications.length === 0) return null;

    return notifications.map((item) => (
      <NotificationGroup
        key={item.group_key}
        notificationGroupId={item.group_key}
        unread={false}
      />
    ));
  }, [notifications]);

  const emptyMessage = (
    <FormattedMessage
      id='empty_column.pending_mentions'
      defaultMessage='No mentions awaiting reply.'
    />
  );

  const prepend = (
    <div className='notification__filter-bar' style={{ padding: '15px' }}>
      <FormattedMessage
        id='pending_mentions.explanation'
        defaultMessage='Favourite a mention to remove it from this list.'
      />
    </div>
  );

  const scrollContainer = signedIn ? (
    <ScrollableList
      scrollKey='pending-mentions'
      isLoading={false}
      showLoading={false}
      hasMore={false}
      prepend={prepend}
      alwaysPrepend
      emptyMessage={emptyMessage}
      bindToDocument={!multiColumn}
    >
      {scrollableContent}
    </ScrollableList>
  ) : (
    <NotSignedInIndicator />
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.title)}
    >
      <ColumnHeader
        icon='chat_bubble'
        iconComponent={ChatBubbleIcon}
        title={intl.formatMessage(messages.title)}
        multiColumn={multiColumn}
      />

      {scrollContainer}

      <Helmet>
        <title>{intl.formatMessage(messages.title)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default PendingMentions;
