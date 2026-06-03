import { useEffect, useRef, useCallback } from 'react';

import { FormattedMessage } from 'react-intl';

import { Link, useParams } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import EditIcon from '@/material-icons/400-24px/edit.svg?react';
import PeopleIcon from '@/material-icons/400-24px/group.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import { fetchOccmGroup } from 'mastodon/actions/occm_groups';
import { connectOccmGroupStream } from 'mastodon/actions/streaming';
import { expandOccmGroupTimeline } from 'mastodon/actions/timelines';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { Icon } from 'mastodon/components/icon';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import BundleColumnError from 'mastodon/features/ui/components/bundle_column_error';
import StatusListContainer from 'mastodon/features/ui/containers/status_list_container';
import { useAppSelector, useAppDispatch } from 'mastodon/store';

import { OccmGroupCompose } from './components/occm_group_compose';

const OccmGroupTimeline: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const columnRef = useRef<{ scrollTop: () => void } | null>(null);
  const group = useAppSelector((state) => state.occm_groups.get(id));
  const hasUnread = useAppSelector(
    (state) =>
      (state.timelines.getIn([`occm_group:${id}`, 'unread']) as number) > 0,
  );

  useEffect(() => {
    void dispatch(fetchOccmGroup(id));
    void dispatch(expandOccmGroupTimeline(id));

    // connectOccmGroupStream returns a thunk that returns a disconnect function
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const disconnect = dispatch(connectOccmGroupStream(id)) as unknown as
      | (() => void)
      | undefined;

    return () => {
      disconnect?.();
    };
  }, [dispatch, id]);

  const handleHeaderClick = useCallback(() => {
    columnRef.current?.scrollTop();
  }, []);

  const handleLoadMore = useCallback(
    (maxId: string) => {
      void dispatch(expandOccmGroupTimeline(id, { maxId }));
    },
    [dispatch, id],
  );

  const title = group ? (group.get('title') as string) : id;

  if (typeof group === 'undefined') {
    return (
      <Column>
        <div className='scrollable'>
          <LoadingIndicator />
        </div>
      </Column>
    );
  } else if (group === null) {
    return <BundleColumnError multiColumn={multiColumn} errorType='routing' />;
  }

  return (
    <Column bindToDocument={!multiColumn} label={title}>
      <ColumnHeader
        icon='groups'
        iconComponent={GroupsIcon}
        active={hasUnread}
        title={title}
        onClick={handleHeaderClick}
        multiColumn={multiColumn}
        showBackButton
      >
        <div className='column-settings'>
          <section className='column-header__links'>
            <Link
              to={`/groups/${id}/edit`}
              className='text-btn column-header__setting-btn'
            >
              <Icon id='pencil' icon={EditIcon} />{' '}
              <FormattedMessage
                id='occm_groups.edit'
                defaultMessage='Edit group'
              />
            </Link>

            <Link
              to={`/groups/${id}/members`}
              className='text-btn column-header__setting-btn'
            >
              <Icon id='users' icon={PeopleIcon} />{' '}
              <FormattedMessage
                id='occm_groups.members'
                defaultMessage='Members'
              />
            </Link>
          </section>
        </div>
      </ColumnHeader>

      <OccmGroupCompose groupId={id} />

      <StatusListContainer
        trackScroll
        scrollKey={`occm_group_timeline-${id}`}
        timelineId={`occm_group:${id}`}
        onLoadMore={handleLoadMore}
        emptyMessage={
          <FormattedMessage
            id='empty_column.occm_group'
            defaultMessage='There is nothing in this group yet. When members post, their statuses will appear here.'
          />
        }
        bindToDocument={!multiColumn}
      />

      <Helmet>
        <title>{title}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default OccmGroupTimeline;
