/* eslint-disable react/jsx-no-bind, @typescript-eslint/no-misused-promises */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { defineMessages, FormattedMessage, useIntl } from 'react-intl';

import { Link, useHistory, useParams } from 'react-router-dom';

import { Helmet } from '@unhead/react/helmet';

import AddIcon from '@/material-icons/400-24px/add.svg?react';
import BlockIcon from '@/material-icons/400-24px/block.svg?react';
import CheckIcon from '@/material-icons/400-24px/check.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import DeleteIcon from '@/material-icons/400-24px/delete.svg?react';
import GroupsIcon from '@/material-icons/400-24px/groups.svg?react';
import PersonAddIcon from '@/material-icons/400-24px/person_add.svg?react';
import ReportIcon from '@/material-icons/400-24px/report.svg?react';
import api from 'mastodon/api';
import type { ApiAccountJSON } from 'mastodon/api_types/accounts';
import type {
  ApiCommunityGroupJSON,
  ApiStatusJSON,
} from 'mastodon/api_types/statuses';
import { Column } from 'mastodon/components/column';
import { ColumnHeader } from 'mastodon/components/column_header';
import { Icon } from 'mastodon/components/icon';
import { LoadingIndicator } from 'mastodon/components/loading_indicator';
import ScrollableList from 'mastodon/components/scrollable_list';
import { me } from 'mastodon/initial_state';

interface ApiCommunityGroupMembershipJSON {
  id: string;
  role: 'admin' | 'moderator' | 'member';
  account: ApiAccountJSON;
}

interface ApiCommunityGroupInvitationJSON {
  id: string;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
  expires_at?: string;
  created_at: string;
  account: ApiAccountJSON;
}

interface ApiCommunityGroupJoinRequestJSON {
  id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  reviewed_at?: string;
  account: ApiAccountJSON;
}

interface ApiCommunityGroupBlockJSON {
  id: string;
  reason: string;
  created_at: string;
  account: ApiAccountJSON;
}

interface ApiCommunityGroupReportJSON {
  id: string;
  action_taken: boolean;
  action_taken_at?: string;
  comment: string;
  created_at: string;
  status_ids: string[];
  rule_ids: string[];
  account: ApiAccountJSON;
  target_account: ApiAccountJSON;
  community_group: ApiCommunityGroupJSON;
}

const messages = defineMessages({
  heading: { id: 'community_groups.heading', defaultMessage: 'Groups' },
  createGroup: {
    id: 'community_groups.create_group',
    defaultMessage: 'Create group',
  },
  displayName: {
    id: 'community_groups.display_name',
    defaultMessage: 'Display name',
  },
  description: {
    id: 'community_groups.description',
    defaultMessage: 'Description',
  },
  locked: {
    id: 'community_groups.locked',
    defaultMessage: 'Require approval to join',
  },
  discoverable: {
    id: 'community_groups.discoverable',
    defaultMessage: 'Show this group in discovery surfaces',
  },
  joinByToken: {
    id: 'community_groups.join_by_token',
    defaultMessage: 'Join by share token',
  },
  shareToken: {
    id: 'community_groups.share_token',
    defaultMessage: 'Share token',
  },
  joinMessage: {
    id: 'community_groups.join_message',
    defaultMessage: 'Join request message',
  },
  join: { id: 'community_groups.join', defaultMessage: 'Join' },
  save: { id: 'community_groups.save', defaultMessage: 'Save' },
  leave: { id: 'community_groups.leave', defaultMessage: 'Leave group' },
  deleteGroup: {
    id: 'community_groups.delete_group',
    defaultMessage: 'Delete group',
  },
  rotateShareLink: {
    id: 'community_groups.rotate_share_link',
    defaultMessage: 'Rotate share token',
  },
  groupSettings: {
    id: 'community_groups.group_settings',
    defaultMessage: 'Group settings',
  },
  post: { id: 'community_groups.post', defaultMessage: 'Post to group' },
  postPlaceholder: {
    id: 'community_groups.post_placeholder',
    defaultMessage: 'Write a group-only post…',
  },
  timeline: { id: 'community_groups.timeline', defaultMessage: 'Timeline' },
  management: {
    id: 'community_groups.management',
    defaultMessage: 'Management',
  },
  members: { id: 'community_groups.members', defaultMessage: 'Members' },
  requests: {
    id: 'community_groups.requests',
    defaultMessage: 'Join requests',
  },
  invitations: {
    id: 'community_groups.invitations',
    defaultMessage: 'Invitations',
  },
  bans: { id: 'community_groups.bans', defaultMessage: 'Bans' },
  reports: { id: 'community_groups.reports', defaultMessage: 'Reports' },
  inviteAccount: {
    id: 'community_groups.invite_account',
    defaultMessage: 'Invite local account ID',
  },
  banAccount: {
    id: 'community_groups.ban_account',
    defaultMessage: 'Ban local account ID',
  },
  transferAccount: {
    id: 'community_groups.transfer_account',
    defaultMessage: 'Transfer ownership to local account ID',
  },
  reason: { id: 'community_groups.reason', defaultMessage: 'Reason' },
  invite: { id: 'community_groups.invite', defaultMessage: 'Invite' },
  ban: { id: 'community_groups.ban', defaultMessage: 'Ban' },
  transfer: { id: 'community_groups.transfer', defaultMessage: 'Transfer' },
  approve: { id: 'community_groups.approve', defaultMessage: 'Approve' },
  reject: { id: 'community_groups.reject', defaultMessage: 'Reject' },
  makeModerator: {
    id: 'community_groups.make_moderator',
    defaultMessage: 'Make moderator',
  },
  makeMember: {
    id: 'community_groups.make_member',
    defaultMessage: 'Make member',
  },
  remove: { id: 'community_groups.remove', defaultMessage: 'Remove' },
  resolve: { id: 'community_groups.resolve', defaultMessage: 'Resolve' },
  reopen: { id: 'community_groups.reopen', defaultMessage: 'Reopen' },
  report: { id: 'community_groups.report', defaultMessage: 'Report' },
  reportReason: {
    id: 'community_groups.report_reason',
    defaultMessage: 'Report reason',
  },
  deleteStatus: {
    id: 'community_groups.delete_status',
    defaultMessage: 'Delete post',
  },
  loadFailed: {
    id: 'community_groups.load_failed',
    defaultMessage: 'Could not load groups.',
  },
  empty: {
    id: 'community_groups.empty',
    defaultMessage: 'No groups yet. Create one or join with a share token.',
  },
  managerHint: {
    id: 'community_groups.manager_hint',
    defaultMessage:
      'Admins and moderators can manage members, invitations, join requests, bans, reports, and group posts here.',
  },
  manualReportHint: {
    id: 'community_groups.manual_report_hint',
    defaultMessage:
      'Group reports currently support only a manually entered reason.',
  },
});

const accountLabel = (account: ApiAccountJSON) =>
  account.display_name || `@${account.acct}`;

const errorText = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } })
      .response;
    return response?.data?.error;
  }

  return undefined;
};

const AccountLine: React.FC<{
  account: ApiAccountJSON;
  meta?: React.ReactNode;
}> = ({ account, meta }) => (
  <div className='account account--minimal'>
    <div className='account__wrapper'>
      <Link className='account__display-name' to={`/@${account.acct}`}>
        <div className='account__avatar-wrapper'>
          <img
            alt=''
            className='account__avatar'
            src={account.avatar_static}
            width={36}
            height={36}
          />
        </div>

        <span className='display-name'>
          <strong>{accountLabel(account)}</strong>
          <span className='display-name__account'>@{account.acct}</span>
        </span>
      </Link>

      {meta && <div className='account__relationship'>{meta}</div>}
    </div>
  </div>
);

const PlainButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...props
}) => (
  <button {...props} type='button' className='button'>
    {children}
  </button>
);

const SecondaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, ...props }) => (
  <button {...props} type='button' className='button button-secondary'>
    {children}
  </button>
);

const GroupsList: React.FC<{ multiColumn?: boolean }> = ({ multiColumn }) => {
  const intl = useIntl();
  const [groups, setGroups] = useState<ApiCommunityGroupJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const { data } =
        await api().get<ApiCommunityGroupJSON[]>('/api/v1/groups');
      setGroups(data);
    } catch (err) {
      setError(errorText(err) ?? intl.formatMessage(messages.loadFailed));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleJoinByToken = useCallback(async () => {
    await api().post('/api/v1/groups/join_by_token', { token, message });
    setToken('');
    setMessage('');
    await loadGroups();
  }, [loadGroups, message, token]);

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
            title={intl.formatMessage(messages.createGroup)}
            aria-label={intl.formatMessage(messages.createGroup)}
          >
            <Icon id='plus' icon={AddIcon} />
          </Link>
        }
      />

      <ScrollableList
        scrollKey='community_groups'
        bindToDocument={!multiColumn}
        isLoading={loading}
        showLoading={loading}
        emptyMessage={
          <FormattedMessage
            id='community_groups.empty'
            defaultMessage='No groups yet. Create one or join with a share token.'
          />
        }
        alwaysPrepend
        prepend={
          <div className='follow_requests-unlocked_explanation'>
            {error && <p className='warning-hint'>{error}</p>}

            <h3>
              <FormattedMessage
                id='community_groups.join_by_token'
                defaultMessage='Join by share token'
              />
            </h3>
            <input
              className='setting-text'
              value={token}
              onChange={(e) => {
                setToken(e.currentTarget.value);
              }}
              placeholder={intl.formatMessage(messages.shareToken)}
            />
            <input
              className='setting-text'
              value={message}
              onChange={(e) => {
                setMessage(e.currentTarget.value);
              }}
              placeholder={intl.formatMessage(messages.joinMessage)}
            />
            <p>
              <SecondaryButton
                onClick={handleJoinByToken}
                disabled={!token.trim()}
              >
                <Icon id='person-add' icon={PersonAddIcon} />{' '}
                {intl.formatMessage(messages.join)}
              </SecondaryButton>
            </p>
          </div>
        }
      >
        {groups.map((group) => (
          <div className='lists__item' key={group.id}>
            <Link to={`/groups/${group.id}`} className='lists__item__title'>
              <Icon id='groups' icon={GroupsIcon} />
              <span>{group.display_name}</span>
            </Link>
            <span>
              {group.members_count} · {group.statuses_count}
            </span>
          </div>
        ))}
      </ScrollableList>

      <Helmet>
        <title>{intl.formatMessage(messages.heading)}</title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

const GroupsDetail: React.FC<{ id: string; multiColumn?: boolean }> = ({
  id,
  multiColumn,
}) => {
  const intl = useIntl();
  const history = useHistory();
  const [group, setGroup] = useState<ApiCommunityGroupJSON>();
  const [memberships, setMemberships] = useState<
    ApiCommunityGroupMembershipJSON[]
  >([]);
  const [requests, setRequests] = useState<ApiCommunityGroupJoinRequestJSON[]>(
    [],
  );
  const [invitations, setInvitations] = useState<
    ApiCommunityGroupInvitationJSON[]
  >([]);
  const [blocks, setBlocks] = useState<ApiCommunityGroupBlockJSON[]>([]);
  const [reports, setReports] = useState<ApiCommunityGroupReportJSON[]>([]);
  const [statuses, setStatuses] = useState<ApiStatusJSON[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [postText, setPostText] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editLocked, setEditLocked] = useState(false);
  const [editDiscoverable, setEditDiscoverable] = useState(false);
  const [shareTokenValue, setShareTokenValue] = useState('');
  const [inviteAccountId, setInviteAccountId] = useState('');
  const [banAccountId, setBanAccountId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [reportReasonByStatus, setReportReasonByStatus] = useState<
    Record<string, string>
  >({});

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.account.id === me),
    [memberships],
  );
  const isAdmin = currentMembership?.role === 'admin';
  const isManager =
    currentMembership?.role === 'admin' ||
    currentMembership?.role === 'moderator';

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const [groupResponse, membershipsResponse, statusesResponse] =
        await Promise.all([
          api().get<ApiCommunityGroupJSON>(`/api/v1/groups/${id}`),
          api().get<ApiCommunityGroupMembershipJSON[]>(
            `/api/v1/groups/${id}/memberships`,
          ),
          api().get<ApiStatusJSON[]>(`/api/v1/timelines/group/${id}`),
        ]);

      setGroup(groupResponse.data);
      setEditDisplayName(groupResponse.data.display_name);
      setEditNote(groupResponse.data.note);
      setEditLocked(groupResponse.data.locked);
      setEditDiscoverable(groupResponse.data.discoverable);
      setMemberships(membershipsResponse.data);
      setStatuses(statusesResponse.data);

      const role = membershipsResponse.data.find(
        (membership) => membership.account.id === me,
      )?.role;
      if (role === 'admin' || role === 'moderator') {
        const [
          requestsResponse,
          invitationsResponse,
          blocksResponse,
          reportsResponse,
          shareResponse,
        ] = await Promise.all([
          api().get<ApiCommunityGroupJoinRequestJSON[]>(
            `/api/v1/groups/${id}/membership_requests`,
          ),
          api().get<ApiCommunityGroupInvitationJSON[]>(
            `/api/v1/groups/${id}/invitations`,
          ),
          api().get<ApiCommunityGroupBlockJSON[]>(
            `/api/v1/groups/${id}/blocks`,
          ),
          api().get<ApiCommunityGroupReportJSON[]>(
            `/api/v1/groups/${id}/reports`,
          ),
          api().get<{ share_token: string }>(`/api/v1/groups/${id}/share`),
        ]);

        setRequests(requestsResponse.data);
        setInvitations(invitationsResponse.data);
        setBlocks(blocksResponse.data);
        setReports(reportsResponse.data);
        setShareTokenValue(shareResponse.data.share_token);
      }
    } catch (err) {
      setError(errorText(err) ?? intl.formatMessage(messages.loadFailed));
    } finally {
      setLoading(false);
    }
  }, [id, intl]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleSaveGroup = useCallback(async () => {
    const { data } = await api().put<ApiCommunityGroupJSON>(
      `/api/v1/groups/${id}`,
      {
        display_name: editDisplayName,
        note: editNote,
        locked: editLocked,
        discoverable: editDiscoverable,
      },
    );

    setGroup(data);
  }, [editDiscoverable, editDisplayName, editLocked, editNote, id]);

  const handleRotateShareToken = useCallback(async () => {
    const { data } = await api().post<{ share_token: string }>(
      `/api/v1/groups/${id}/share_link`,
    );
    setShareTokenValue(data.share_token);
  }, [id]);

  const handleLeaveGroup = useCallback(async () => {
    await api().post(`/api/v1/groups/${id}/leave`);
    history.push('/groups');
  }, [history, id]);

  const handleDeleteGroup = useCallback(async () => {
    await api().delete(`/api/v1/groups/${id}`);
    history.push('/groups');
  }, [history, id]);

  const handlePost = useCallback(async () => {
    const { data } = await api().post<ApiStatusJSON>('/api/v1/statuses', {
      status: postText,
      visibility: 'limited',
      community_group_id: id,
    });
    setStatuses((current) => [data, ...current]);
    setPostText('');
  }, [id, postText]);

  const handleDeleteStatus = useCallback(async (statusId: string) => {
    await api().delete(`/api/v1/statuses/${statusId}`);
    setStatuses((current) =>
      current.filter((status) => status.id !== statusId),
    );
  }, []);

  const handleReportStatus = useCallback(
    async (status: ApiStatusJSON) => {
      const comment = reportReasonByStatus[status.id]?.trim();
      if (!comment) return;

      const { data } = await api().post<ApiCommunityGroupReportJSON>(
        `/api/v1/groups/${id}/reports`,
        {
          account_id: status.account.id,
          comment,
          status_ids: [status.id],
        },
      );

      setReports((current) => [data, ...current]);
      setReportReasonByStatus((current) => ({ ...current, [status.id]: '' }));
    },
    [id, reportReasonByStatus],
  );

  const handleMembershipRole = useCallback(
    async (
      membership: ApiCommunityGroupMembershipJSON,
      role: 'moderator' | 'member',
    ) => {
      const { data } = await api().put<ApiCommunityGroupMembershipJSON>(
        `/api/v1/groups/${id}/memberships/${membership.id}`,
        { role },
      );
      setMemberships((current) =>
        current.map((item) => (item.id === membership.id ? data : item)),
      );
    },
    [id],
  );

  const handleRemoveMembership = useCallback(
    async (membership: ApiCommunityGroupMembershipJSON) => {
      await api().delete(`/api/v1/groups/${id}/memberships/${membership.id}`);
      setMemberships((current) =>
        current.filter((item) => item.id !== membership.id),
      );
    },
    [id],
  );

  const handleJoinRequest = useCallback(
    async (requestId: string, action: 'authorize' | 'reject') => {
      await api().post(
        `/api/v1/groups/${id}/membership_requests/${requestId}/${action}`,
      );
      setRequests((current) =>
        current.filter((request) => request.id !== requestId),
      );
      await loadDetail();
    },
    [id, loadDetail],
  );

  const handleInvite = useCallback(async () => {
    const { data } = await api().post<ApiCommunityGroupInvitationJSON>(
      `/api/v1/groups/${id}/invitations`,
      { account_id: inviteAccountId },
    );
    setInvitations((current) => [data, ...current]);
    setInviteAccountId('');
  }, [id, inviteAccountId]);

  const handleBan = useCallback(async () => {
    const { data } = await api().post<ApiCommunityGroupBlockJSON>(
      `/api/v1/groups/${id}/blocks`,
      { account_id: banAccountId, reason: banReason },
    );
    setBlocks((current) => [data, ...current]);
    setBanAccountId('');
    setBanReason('');
    await loadDetail();
  }, [banAccountId, banReason, id, loadDetail]);

  const handleUnban = useCallback(
    async (accountId: string) => {
      await api().delete(`/api/v1/groups/${id}/blocks/${accountId}`);
      setBlocks((current) =>
        current.filter((block) => block.account.id !== accountId),
      );
    },
    [id],
  );

  const handleTransfer = useCallback(async () => {
    const { data } = await api().post<ApiCommunityGroupJSON>(
      `/api/v1/groups/${id}/transfer_ownership`,
      { account_id: transferAccountId },
    );
    setGroup(data);
    setTransferAccountId('');
    await loadDetail();
  }, [id, loadDetail, transferAccountId]);

  const handleReportResolution = useCallback(
    async (report: ApiCommunityGroupReportJSON) => {
      const action = report.action_taken ? 'unresolve' : 'resolve';
      const { data } = await api().post<ApiCommunityGroupReportJSON>(
        `/api/v1/groups/${id}/reports/${report.id}/${action}`,
      );
      setReports((current) =>
        current.map((item) => (item.id === report.id ? data : item)),
      );
    },
    [id],
  );

  if (loading && !group) {
    return <LoadingIndicator />;
  }

  return (
    <Column
      bindToDocument={!multiColumn}
      label={group?.display_name ?? intl.formatMessage(messages.heading)}
    >
      <ColumnHeader
        title={group?.display_name ?? intl.formatMessage(messages.heading)}
        icon='groups'
        iconComponent={GroupsIcon}
        multiColumn={multiColumn}
        showBackButton
      />

      <ScrollableList
        scrollKey={`community_group_${id}`}
        bindToDocument={!multiColumn}
        isLoading={loading}
        prepend={
          <div className='follow_requests-unlocked_explanation'>
            {error && <p className='warning-hint'>{error}</p>}
            {group && <p>{group.note}</p>}

            <h3>
              <FormattedMessage
                id='community_groups.post'
                defaultMessage='Post to group'
              />
            </h3>
            <textarea
              className='setting-text light'
              value={postText}
              onChange={(e) => {
                setPostText(e.currentTarget.value);
              }}
              placeholder={intl.formatMessage(messages.postPlaceholder)}
            />
            <p>
              <PlainButton onClick={handlePost} disabled={!postText.trim()}>
                <Icon id='plus' icon={AddIcon} />{' '}
                {intl.formatMessage(messages.post)}
              </PlainButton>
            </p>

            <h3>
              <FormattedMessage
                id='community_groups.group_settings'
                defaultMessage='Group settings'
              />
            </h3>
            {isAdmin ? (
              <>
                <input
                  className='setting-text'
                  value={editDisplayName}
                  onChange={(e) => {
                    setEditDisplayName(e.currentTarget.value);
                  }}
                  placeholder={intl.formatMessage(messages.displayName)}
                />
                <textarea
                  className='setting-text light'
                  value={editNote}
                  onChange={(e) => {
                    setEditNote(e.currentTarget.value);
                  }}
                  placeholder={intl.formatMessage(messages.description)}
                />
                <label>
                  <input
                    type='checkbox'
                    checked={editLocked}
                    onChange={(e) => {
                      setEditLocked(e.currentTarget.checked);
                    }}
                  />{' '}
                  {intl.formatMessage(messages.locked)}
                </label>
                <label>
                  <input
                    type='checkbox'
                    checked={editDiscoverable}
                    onChange={(e) => {
                      setEditDiscoverable(e.currentTarget.checked);
                    }}
                  />{' '}
                  {intl.formatMessage(messages.discoverable)}
                </label>
                <p>
                  <SecondaryButton
                    onClick={handleSaveGroup}
                    disabled={!editDisplayName.trim()}
                  >
                    {intl.formatMessage(messages.save)}
                  </SecondaryButton>
                </p>
                <p>
                  <SecondaryButton onClick={handleDeleteGroup}>
                    <Icon id='delete' icon={DeleteIcon} />{' '}
                    {intl.formatMessage(messages.deleteGroup)}
                  </SecondaryButton>
                </p>
              </>
            ) : (
              <p>
                <SecondaryButton onClick={handleLeaveGroup}>
                  {intl.formatMessage(messages.leave)}
                </SecondaryButton>
              </p>
            )}

            {isManager && (
              <>
                <h3>
                  <FormattedMessage
                    id='community_groups.management'
                    defaultMessage='Management'
                  />
                </h3>
                <p>
                  <FormattedMessage
                    id='community_groups.manager_hint'
                    defaultMessage='Admins and moderators can manage members, invitations, join requests, bans, reports, and group posts here.'
                  />
                </p>

                {shareTokenValue && (
                  <input
                    className='setting-text'
                    readOnly
                    value={shareTokenValue}
                    aria-label={intl.formatMessage(messages.shareToken)}
                  />
                )}
                {isAdmin && (
                  <p>
                    <SecondaryButton onClick={handleRotateShareToken}>
                      {intl.formatMessage(messages.rotateShareLink)}
                    </SecondaryButton>
                  </p>
                )}

                <input
                  className='setting-text'
                  value={inviteAccountId}
                  onChange={(e) => {
                    setInviteAccountId(e.currentTarget.value);
                  }}
                  placeholder={intl.formatMessage(messages.inviteAccount)}
                />
                <p>
                  <SecondaryButton
                    onClick={handleInvite}
                    disabled={!inviteAccountId.trim()}
                  >
                    <Icon id='person-add' icon={PersonAddIcon} />{' '}
                    {intl.formatMessage(messages.invite)}
                  </SecondaryButton>
                </p>

                <input
                  className='setting-text'
                  value={banAccountId}
                  onChange={(e) => {
                    setBanAccountId(e.currentTarget.value);
                  }}
                  placeholder={intl.formatMessage(messages.banAccount)}
                />
                <input
                  className='setting-text'
                  value={banReason}
                  onChange={(e) => {
                    setBanReason(e.currentTarget.value);
                  }}
                  placeholder={intl.formatMessage(messages.reason)}
                />
                <p>
                  <SecondaryButton
                    onClick={handleBan}
                    disabled={!banAccountId.trim()}
                  >
                    <Icon id='block' icon={BlockIcon} />{' '}
                    {intl.formatMessage(messages.ban)}
                  </SecondaryButton>
                </p>

                {isAdmin && (
                  <>
                    <input
                      className='setting-text'
                      value={transferAccountId}
                      onChange={(e) => {
                        setTransferAccountId(e.currentTarget.value);
                      }}
                      placeholder={intl.formatMessage(messages.transferAccount)}
                    />
                    <p>
                      <SecondaryButton
                        onClick={handleTransfer}
                        disabled={!transferAccountId.trim()}
                      >
                        {intl.formatMessage(messages.transfer)}
                      </SecondaryButton>
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        }
      >
        <section className='follow_requests-unlocked_explanation'>
          <h3>{intl.formatMessage(messages.timeline)}</h3>
          {statuses.map((status) => (
            <article key={status.id} className='notification__message'>
              <AccountLine
                account={status.account}
                meta={status.approval_status}
              />
              <div
                className='status__content'
                dangerouslySetInnerHTML={{ __html: status.content ?? '' }}
              />
              <textarea
                className='setting-text light'
                value={reportReasonByStatus[status.id] ?? ''}
                onChange={(e) => {
                  setReportReasonByStatus((current) => ({
                    ...current,
                    [status.id]: e.currentTarget.value,
                  }));
                }}
                placeholder={intl.formatMessage(messages.reportReason)}
              />
              <p>
                <SecondaryButton
                  onClick={() => {
                    void handleReportStatus(status);
                  }}
                  disabled={!reportReasonByStatus[status.id]?.trim()}
                >
                  <Icon id='report' icon={ReportIcon} />{' '}
                  {intl.formatMessage(messages.report)}
                </SecondaryButton>
                {isManager && (
                  <SecondaryButton
                    onClick={() => {
                      void handleDeleteStatus(status.id);
                    }}
                  >
                    <Icon id='delete' icon={DeleteIcon} />{' '}
                    {intl.formatMessage(messages.deleteStatus)}
                  </SecondaryButton>
                )}
              </p>
            </article>
          ))}
        </section>

        <section className='follow_requests-unlocked_explanation'>
          <h3>{intl.formatMessage(messages.members)}</h3>
          {memberships.map((membership) => (
            <AccountLine
              key={membership.id}
              account={membership.account}
              meta={
                <>
                  <span>{membership.role}</span>
                  {isAdmin && membership.role === 'member' && (
                    <SecondaryButton
                      onClick={() => {
                        void handleMembershipRole(membership, 'moderator');
                      }}
                    >
                      {intl.formatMessage(messages.makeModerator)}
                    </SecondaryButton>
                  )}
                  {isAdmin && membership.role === 'moderator' && (
                    <SecondaryButton
                      onClick={() => {
                        void handleMembershipRole(membership, 'member');
                      }}
                    >
                      {intl.formatMessage(messages.makeMember)}
                    </SecondaryButton>
                  )}
                  {isManager && membership.role !== 'admin' && (
                    <SecondaryButton
                      onClick={() => {
                        void handleRemoveMembership(membership);
                      }}
                    >
                      {intl.formatMessage(messages.remove)}
                    </SecondaryButton>
                  )}
                </>
              }
            />
          ))}
        </section>

        {isManager && (
          <>
            <section className='follow_requests-unlocked_explanation'>
              <h3>{intl.formatMessage(messages.requests)}</h3>
              {requests.map((request) => (
                <AccountLine
                  key={request.id}
                  account={request.account}
                  meta={
                    <>
                      <span>{request.message}</span>
                      <SecondaryButton
                        onClick={() => {
                          void handleJoinRequest(request.id, 'authorize');
                        }}
                      >
                        <Icon id='check' icon={CheckIcon} />{' '}
                        {intl.formatMessage(messages.approve)}
                      </SecondaryButton>
                      <SecondaryButton
                        onClick={() => {
                          void handleJoinRequest(request.id, 'reject');
                        }}
                      >
                        <Icon id='close' icon={CloseIcon} />{' '}
                        {intl.formatMessage(messages.reject)}
                      </SecondaryButton>
                    </>
                  }
                />
              ))}
            </section>

            <section className='follow_requests-unlocked_explanation'>
              <h3>{intl.formatMessage(messages.invitations)}</h3>
              {invitations.map((invitation) => (
                <AccountLine
                  key={invitation.id}
                  account={invitation.account}
                  meta={invitation.status}
                />
              ))}
            </section>

            <section className='follow_requests-unlocked_explanation'>
              <h3>{intl.formatMessage(messages.bans)}</h3>
              {blocks.map((block) => (
                <AccountLine
                  key={block.id}
                  account={block.account}
                  meta={
                    <SecondaryButton
                      onClick={() => {
                        void handleUnban(block.account.id);
                      }}
                    >
                      {intl.formatMessage(messages.remove)}
                    </SecondaryButton>
                  }
                />
              ))}
            </section>

            <section className='follow_requests-unlocked_explanation'>
              <h3>{intl.formatMessage(messages.reports)}</h3>
              <p>
                <FormattedMessage
                  id='community_groups.manual_report_hint'
                  defaultMessage='Group reports currently support only a manually entered reason.'
                />
              </p>
              {reports.map((report) => (
                <div key={report.id} className='notification__message'>
                  <AccountLine
                    account={report.account}
                    meta={
                      report.action_taken
                        ? intl.formatMessage(messages.resolve)
                        : intl.formatMessage(messages.reopen)
                    }
                  />
                  <p>{report.comment}</p>
                  <p>
                    @{report.target_account.acct} · #
                    {report.status_ids.join(', #')}
                  </p>
                  <SecondaryButton
                    onClick={() => {
                      void handleReportResolution(report);
                    }}
                  >
                    {report.action_taken
                      ? intl.formatMessage(messages.reopen)
                      : intl.formatMessage(messages.resolve)}
                  </SecondaryButton>
                </div>
              ))}
            </section>
          </>
        )}
      </ScrollableList>

      <Helmet>
        <title>
          {group?.display_name ?? intl.formatMessage(messages.heading)}
        </title>
        <meta name='robots' content='noindex' />
      </Helmet>
    </Column>
  );
};

const CommunityGroups: React.FC<{ multiColumn?: boolean }> = ({
  multiColumn,
}) => {
  const { id } = useParams<{ id?: string }>();

  if (id) {
    return <GroupsDetail id={id} multiColumn={multiColumn} />;
  }

  return <GroupsList multiColumn={multiColumn} />;
};

// eslint-disable-next-line import/no-default-export
export default CommunityGroups;
