import { useCallback, useMemo } from 'react';

import { defineMessages, useIntl } from 'react-intl';

import { Link } from 'react-router-dom';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import MoreHorizIcon from '@/material-icons/400-24px/more_horiz.svg?react';
import { openModal } from 'mastodon/actions/modal';
import { deleteOccmGroup } from 'mastodon/actions/occm_groups';
import { Dropdown } from 'mastodon/components/dropdown_menu';
import { Icon } from 'mastodon/components/icon';
import { useAppDispatch } from 'mastodon/store';

const messages = defineMessages({
  edit: { id: 'occm_groups.edit', defaultMessage: 'Edit group' },
  delete: { id: 'occm_groups.delete', defaultMessage: 'Delete group' },
  more: { id: 'status.more', defaultMessage: 'More' },
});

export const OccmGroupItem: React.FC<{
  id: string;
  title: string;
  memberCount: number;
}> = ({ id, title, memberCount }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const handleDeleteClick = useCallback(() => {
    dispatch(
      openModal({
        modalType: 'CONFIRM',
        modalProps: {
          message: intl.formatMessage({
            id: 'occm_groups.confirm_delete',
            defaultMessage:
              'Are you sure you want to delete this group? This cannot be undone.',
          }),
          confirm: intl.formatMessage(messages.delete),
          onConfirm: () => {
            void dispatch(deleteOccmGroup(id));
          },
        },
      }),
    );
  }, [dispatch, id, intl]);

  const menu = useMemo(
    () => [
      { text: intl.formatMessage(messages.edit), to: `/groups/${id}/edit` },
      { text: intl.formatMessage(messages.delete), action: handleDeleteClick },
    ],
    [intl, id, handleDeleteClick],
  );

  return (
    <div className='lists__item'>
      <Link to={`/groups/${id}`} className='lists__item__title'>
        <Icon id='groups' icon={GroupsIcon} />
        <span>{title}</span>
        <span className='lists__item__meta'>
          {intl.formatMessage(
            {
              id: 'occm_groups.member_count',
              defaultMessage:
                '{count, plural, one {# member} other {# members}}',
            },
            { count: memberCount },
          )}
        </span>
      </Link>

      <Dropdown
        scrollKey='occm_groups'
        items={menu}
        icon='ellipsis-h'
        iconComponent={MoreHorizIcon}
        title={intl.formatMessage(messages.more)}
      />
    </div>
  );
};
