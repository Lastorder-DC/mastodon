import { useEffect, useState } from 'react';

import { useIntl, defineMessages } from 'react-intl';

import GroupsActiveIcon from '@/material-icons/400-24px/groups-fill.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { fetchOccmGroups } from 'mastodon/actions/occm_groups';
import { ColumnLink } from 'mastodon/features/ui/components/column_link';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

import { CollapsiblePanel } from './collapsible_panel';

const messages = defineMessages({
  groups: { id: 'occm_groups.title', defaultMessage: 'Groups' },
  expand: {
    id: 'navigation_panel.expand_groups',
    defaultMessage: 'Expand groups menu',
  },
  collapse: {
    id: 'navigation_panel.collapse_groups',
    defaultMessage: 'Collapse groups menu',
  },
});

export const OccmGroupPanel: React.FC = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const groups = useAppSelector((state) => state.occm_groups);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void dispatch(fetchOccmGroups()).then(() => {
      setLoading(false);

      return '';
    });
  }, [dispatch]);

  const groupList = groups
    .filter((g) => g !== null)
    .valueSeq()
    .toArray();

  return (
    <CollapsiblePanel
      to='/groups'
      icon='groups'
      iconComponent={GroupsIcon}
      activeIconComponent={GroupsActiveIcon}
      title={intl.formatMessage(messages.groups)}
      collapseTitle={intl.formatMessage(messages.collapse)}
      expandTitle={intl.formatMessage(messages.expand)}
      loading={loading}
    >
      {groupList.map((group) => (
        <ColumnLink
          icon='groups'
          key={group.get('id') as string}
          iconComponent={GroupsIcon}
          activeIconComponent={GroupsActiveIcon}
          text={group.get('title') as string}
          to={`/groups/${group.get('id') as string}`}
          transparent
        />
      ))}
    </CollapsiblePanel>
  );
};
