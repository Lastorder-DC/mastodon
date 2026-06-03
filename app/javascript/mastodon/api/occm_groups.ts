import {
  apiRequestPost,
  apiRequestPut,
  apiRequestGet,
  apiRequestDelete,
} from 'mastodon/api';
import type {
  ApiOccmGroupJSON,
  ApiOccmGroupMembershipJSON,
  ApiOccmGroupReportJSON,
} from 'mastodon/api_types/occm_groups';
import type { ApiStatusJSON } from 'mastodon/api_types/statuses';

// Groups CRUD
export const apiGetOccmGroups = () =>
  apiRequestGet<ApiOccmGroupJSON[]>('v1/occm_groups');

export const apiGetOccmGroup = (groupId: string) =>
  apiRequestGet<ApiOccmGroupJSON>(`v1/occm_groups/${groupId}`);

export const apiCreateOccmGroup = (params: {
  title: string;
  description?: string;
  approval_required?: boolean;
}) => apiRequestPost<ApiOccmGroupJSON>('v1/occm_groups', params);

export const apiUpdateOccmGroup = (
  groupId: string,
  params: { title?: string; description?: string; approval_required?: boolean },
) => apiRequestPut<ApiOccmGroupJSON>(`v1/occm_groups/${groupId}`, params);

export const apiDeleteOccmGroup = (groupId: string) =>
  apiRequestDelete(`v1/occm_groups/${groupId}`);

// Members
export const apiGetOccmGroupMembers = (groupId: string) =>
  apiRequestGet<ApiOccmGroupMembershipJSON[]>(
    `v1/occm_groups/${groupId}/members`,
  );

export const apiGetOccmGroupPendingMembers = (groupId: string) =>
  apiRequestGet<ApiOccmGroupMembershipJSON[]>(
    `v1/occm_groups/${groupId}/members/pending`,
  );

export const apiJoinOccmGroup = (groupId: string) =>
  apiRequestPost<ApiOccmGroupMembershipJSON>(
    `v1/occm_groups/${groupId}/members`,
  );

export const apiApproveOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestPost(`v1/occm_groups/${groupId}/members/${accountId}/approve`);

export const apiRejectOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestPost(`v1/occm_groups/${groupId}/members/${accountId}/reject`);

export const apiRemoveOccmGroupMember = (groupId: string, accountId: string) =>
  apiRequestDelete(`v1/occm_groups/${groupId}/members/${accountId}`);

// Moderator/Admin actions
export const apiTransferOccmGroupAdmin = (groupId: string, accountId: string) =>
  apiRequestPost(`v1/occm_groups/${groupId}/transfer_admin`, {
    account_id: accountId,
  });

export const apiPromoteOccmGroupModerator = (
  groupId: string,
  accountId: string,
) =>
  apiRequestPost(`v1/occm_groups/${groupId}/moderators`, {
    account_id: accountId,
  });

export const apiDemoteOccmGroupModerator = (
  groupId: string,
  accountId: string,
) => apiRequestDelete(`v1/occm_groups/${groupId}/moderators/${accountId}`);

// Timeline
export const apiGetOccmGroupTimeline = (
  groupId: string,
  params?: { max_id?: string; since_id?: string; limit?: number },
) =>
  apiRequestGet<ApiStatusJSON[]>(`v1/occm_groups/${groupId}/statuses`, params);

export const apiPostToOccmGroup = (groupId: string, statusId: string) =>
  apiRequestPost(`v1/occm_groups/${groupId}/statuses`, {
    status_id: statusId,
  });

export const apiDeleteOccmGroupStatus = (groupId: string, statusId: string) =>
  apiRequestDelete(`v1/occm_groups/${groupId}/statuses/${statusId}`);

// Reports
export const apiGetOccmGroupReports = (groupId: string) =>
  apiRequestGet<ApiOccmGroupReportJSON[]>(`v1/occm_groups/${groupId}/reports`);

export const apiCreateOccmGroupReport = (
  groupId: string,
  params: {
    target_account_id: string;
    status_ids?: string[];
    comment?: string;
    category?: string;
  },
) =>
  apiRequestPost<ApiOccmGroupReportJSON>(
    `v1/occm_groups/${groupId}/reports`,
    params,
  );

export const apiResolveOccmGroupReport = (groupId: string, reportId: string) =>
  apiRequestPost<ApiOccmGroupReportJSON>(
    `v1/occm_groups/${groupId}/reports/${reportId}/resolve`,
  );
