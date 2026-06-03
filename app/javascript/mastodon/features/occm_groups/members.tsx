import { useEffect, useState, useCallback } from 'react';

import { defineMessages, useIntl, FormattedMessage } from 'react-intl';

import { useParams } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import {
  fetchOccmGroup,
  fetchOccmGroupMembers,
  fetchOccmGroupPendingMembers,
  approveOccmGroupMember,
  rejectOccmGroupMember,
  removeOccmGroupMember,
} from 'mastodon/actions/occm_groups';
import {
  apiPromoteOccmGroupModerator,
  apiDemoteOccmGroupModerator,
} from 'mastodon/api/occm_groups';
import type { ApiOccmGroupMembershipJSON } from 'mastodon/api_types/occm_groups';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import ScrollableList from 'mastodon/components/scrollable_list';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const messages = defineMessages({
  heading: { id: 'occm_groups.members', defaultMessage: 'Members' },
});

const MemberItem: React.FC<{
  member: ApiOccmGroupMembershipJSON;
  groupId: string;
  currentRole: string | null;
}> = ({ member, groupId, currentRole }) => {
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const handleRemove = useCallback(() => {
    void dispatch(removeOccmGroupMember(groupId, member.account.id));
  }, [dispatch, groupId, member.account.id]);

  const handlePromote = useCallback(() => {
    void apiPromoteOccmGroupModerator(groupId, member.account.id);
  }, [groupId, member.account.id]);

  const handleDemote = useCallback(() => {
    void apiDemoteOccmGroupModerator(groupId, member.account.id);
  }, [groupId, member.account.id]);

  const isAdmin = currentRole === 'admin';
  const isMod = currentRole === 'moderator' || isAdmin;

  return (
    <div className='account__wrapper'>
      <div className='account'>
        <div className='account__display-name'>
          <span className='display-name'>
            <bdi>
              <strong>
                {member.account.display_name || member.account.username}
              </strong>
            </bdi>
            <span className='display-name__account'>
              @{member.account.acct}
            </span>
          </span>
          {member.role !== 'user' && (
            <span className='account-role'>{member.role}</span>
          )}
        </div>
      </div>
      {isMod && member.role === 'user' && (
        <div className='account__relationship'>
          <button
            type='button'
            className='button button--destructive'
            onClick={handleRemove}
            title={intl.formatMessage({
              id: 'occm_groups.remove_member',
              defaultMessage: 'Remove from group',
            })}
          >
            <FormattedMessage
              id='occm_groups.remove_member'
              defaultMessage='Remove from group'
            />
          </button>
        </div>
      )}
      {isAdmin && member.role === 'user' && (
        <div className='account__relationship'>
          <button
            type='button'
            className='button'
            onClick={handlePromote}
            title={intl.formatMessage({
              id: 'occm_groups.promote_mod',
              defaultMessage: 'Promote to moderator',
            })}
          >
            <FormattedMessage
              id='occm_groups.promote_mod'
              defaultMessage='Promote to moderator'
            />
          </button>
        </div>
      )}
      {isAdmin && member.role === 'moderator' && (
        <div className='account__relationship'>
          <button
            type='button'
            className='button'
            onClick={handleDemote}
            title={intl.formatMessage({
              id: 'occm_groups.demote_mod',
              defaultMessage: 'Demote from moderator',
            })}
          >
            <FormattedMessage
              id='occm_groups.demote_mod'
              defaultMessage='Demote from moderator'
            />
          </button>
        </div>
      )}
    </div>
  );
};

const PendingMemberItem: React.FC<{
  member: ApiOccmGroupMembershipJSON;
  groupId: string;
}> = ({ member, groupId }) => {
  const dispatch = useAppDispatch();

  const handleApprove = useCallback(() => {
    void dispatch(approveOccmGroupMember(groupId, member.account.id));
  }, [dispatch, groupId, member.account.id]);

  const handleReject = useCallback(() => {
    void dispatch(rejectOccmGroupMember(groupId, member.account.id));
  }, [dispatch, groupId, member.account.id]);

  return (
    <div className='account__wrapper'>
      <div className='account'>
        <div className='account__display-name'>
          <span className='display-name'>
            <bdi>
              <strong>
                {member.account.display_name || member.account.username}
              </strong>
            </bdi>
            <span className='display-name__account'>
              @{member.account.acct}
            </span>
          </span>
        </div>
      </div>
      <div className='account__relationship'>
        <button type='button' className='button' onClick={handleApprove}>
          <FormattedMessage id='occm_groups.approve' defaultMessage='Approve' />
        </button>
        <button
          type='button'
          className='button button--destructive'
          onClick={handleReject}
        >
          <FormattedMessage id='occm_groups.reject' defaultMessage='Reject' />
        </button>
      </div>
    </div>
  );
};

const OccmGroupMembers: React.FC<{
  multiColumn?: boolean;
}> = ({ multiColumn }) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const { id } = useParams<{ id: string }>();
  const group = useAppSelector((state) => state.occm_groups.get(id));

  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');
  const [members, setMembers] = useState<ApiOccmGroupMembershipJSON[]>([]);
  const [pendingMembers, setPendingMembers] = useState<
    ApiOccmGroupMembershipJSON[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void dispatch(fetchOccmGroup(id));
    void dispatch(fetchOccmGroupMembers(id)).then((data) => {
      if (data) setMembers(data);
      setLoading(false);
      return '';
    });
    void dispatch(fetchOccmGroupPendingMembers(id)).then((data) => {
      if (data) setPendingMembers(data);
      return '';
    });
  }, [dispatch, id]);

  const currentRole = group ? (group.get('role') as string | null) : null;

  const handleActiveTab = useCallback(() => {
    setActiveTab('active');
  }, []);
  const handlePendingTab = useCallback(() => {
    setActiveTab('pending');
  }, []);

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
        showBackButton
      />

      <div className='column-header__collapsible'>
        <div className='column-header__button-group'>
          <button
            type='button'
            className={`column-header__button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={handleActiveTab}
          >
            <FormattedMessage
              id='occm_groups.members'
              defaultMessage='Members'
            />
          </button>
          <button
            type='button'
            className={`column-header__button ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={handlePendingTab}
          >
            <FormattedMessage
              id='occm_groups.pending_members'
              defaultMessage='Pending requests'
            />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingIndicator />
      ) : (
        <ScrollableList
          scrollKey='occm_group_members'
          emptyMessage={
            <FormattedMessage
              id='occm_groups.no_members_yet'
              defaultMessage='No members yet.'
            />
          }
          bindToDocument={!multiColumn}
        >
          {activeTab === 'active'
            ? members.map((member) => (
                <MemberItem
                  key={member.id}
                  member={member}
                  groupId={id}
                  currentRole={currentRole}
                />
              ))
            : pendingMembers.map((member) => (
                <PendingMemberItem
                  key={member.id}
                  member={member}
                  groupId={id}
                />
              ))}
        </ScrollableList>
      )}

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default OccmGroupMembers;
