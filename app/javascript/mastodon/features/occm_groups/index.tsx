import { useEffect } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { Link } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { fetchOccmGroups } from 'mastodon/actions/occm_groups';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { Icon } from 'mastodon/components/icon';
import ScrollableList from 'mastodon/components/scrollable_list';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

import { OccmGroupItem } from './components/occm_group_item';

const messages = defineMessages({
  heading: { id: 'occm_groups.title', defaultMessage: 'Groups' },
  create: { id: 'occm_groups.create', defaultMessage: 'Create group' },
});

const OccmGroups: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const groups = useAppSelector((state) => state.occm_groups);

  useEffect(() => {
    void dispatch(fetchOccmGroups());
  }, [dispatch]);

  const groupList = groups
    .filter((g) => g !== null)
    .valueSeq()
    .toArray();

  const emptyMessage = (
    <span>
      <FormattedMessage
        id='occm_groups.no_groups_yet'
        defaultMessage='No groups yet.'
      />
      <br />
      <FormattedMessage
        id='occm_groups.create_a_group'
        defaultMessage='Create a new group to start a private community'
      />
    </span>
  );

  return (
    <Column
      bindToDocument={!multiColumn}
      label={intl.formatMessage(messages.heading)}
    >
      <ColumnHeader
        title={intl.formatMessage(messages.heading)}
        icon='groups'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        extraButton={
          <Link
            to='/groups/new'
            className='column-header__button'
            title={intl.formatMessage(messages.create)}
            aria-label={intl.formatMessage(messages.create)}
          >
            <Icon id='plus' icon={AddIcon} />
          </Link>
        }
      />

      <ScrollableList
        scrollKey='occm_groups'
        emptyMessage={emptyMessage}
        bindToDocument={!multiColumn}
      >
        {groupList.map((group) => (
          <OccmGroupItem
            key={group.get('id') as string}
            id={group.get('id') as string}
            title={group.get('title') as string}
            memberCount={group.get('member_count') as number}
          />
        ))}
      </ScrollableList>

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default OccmGroups;
