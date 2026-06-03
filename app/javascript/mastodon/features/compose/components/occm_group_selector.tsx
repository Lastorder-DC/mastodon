import { useCallback } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { changeComposeOccmGroup } from 'mastodon/actions/compose';
import { Icon } from 'mastodon/components/icon';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

const messages = defineMessages({
  timeline: { id: 'compose.destination.timeline', defaultMessage: 'Timeline' },
  group: { id: 'compose.destination.group', defaultMessage: 'Group: {group}' },
  change: {
    id: 'compose.destination.change',
    defaultMessage: 'Change post destination',
  },
});

export const OccmGroupSelector: React.FC = () => {
  const dispatch = useAppDispatch();
  const intl = useIntl();
  const occmGroupId = useAppSelector(
    (state) => state.compose.get('occm_group_id') as string | null,
  );
  const groups = useAppSelector((state) => state.occm_groups);

  // Get the current group name if one is selected
  const currentGroup = occmGroupId ? groups.get(occmGroupId) : null;
  const groupTitle = currentGroup
    ? (currentGroup.get('title') as string)
    : null;

  const handleClear = useCallback(() => {
    dispatch(changeComposeOccmGroup(null));
  }, [dispatch]);

  // Only show when a group is selected
  if (!occmGroupId) return null;

  return (
    <div className='compose-form__occm-group-indicator'>
      <Icon id='groups' icon={GroupsIcon} />
      <span>
        {intl.formatMessage(messages.group, {
          group: groupTitle ?? occmGroupId,
        })}
      </span>
      <button
        type='button'
        className='compose-form__occm-group-clear'
        onClick={handleClear}
        title={intl.formatMessage(messages.timeline)}
      >
        &times;
      </button>
    </div>
  );
};
