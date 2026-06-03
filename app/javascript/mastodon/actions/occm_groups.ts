import {
  apiGetOccmGroups,
  apiGetOccmGroup,
  apiCreateOccmGroup,
  apiUpdateOccmGroup,
  apiDeleteOccmGroup,
  apiGetOccmGroupMembers,
  apiGetOccmGroupPendingMembers,
  apiJoinOccmGroup,
  apiApproveOccmGroupMember,
  apiRejectOccmGroupMember,
  apiRemoveOccmGroupMember,
} from 'mastodon/api/occm_groups';
import type {
  ApiOccmGroupJSON,
  ApiOccmGroupMembershipJSON,
} from 'mastodon/api_types/occm_groups';
import type { AppDispatch } from 'mastodon/store';

export const OCCM_GROUPS_FETCH_REQUEST = 'OCCM_GROUPS_FETCH_REQUEST';
export const OCCM_GROUPS_FETCH_SUCCESS = 'OCCM_GROUPS_FETCH_SUCCESS';
export const OCCM_GROUPS_FETCH_FAIL = 'OCCM_GROUPS_FETCH_FAIL';

export const OCCM_GROUP_FETCH_REQUEST = 'OCCM_GROUP_FETCH_REQUEST';
export const OCCM_GROUP_FETCH_SUCCESS = 'OCCM_GROUP_FETCH_SUCCESS';
export const OCCM_GROUP_FETCH_FAIL = 'OCCM_GROUP_FETCH_FAIL';

export const OCCM_GROUP_CREATE_SUCCESS = 'OCCM_GROUP_CREATE_SUCCESS';
export const OCCM_GROUP_UPDATE_SUCCESS = 'OCCM_GROUP_UPDATE_SUCCESS';
export const OCCM_GROUP_DELETE_SUCCESS = 'OCCM_GROUP_DELETE_SUCCESS';

export const OCCM_GROUP_MEMBERS_FETCH_REQUEST =
  'OCCM_GROUP_MEMBERS_FETCH_REQUEST';
export const OCCM_GROUP_MEMBERS_FETCH_SUCCESS =
  'OCCM_GROUP_MEMBERS_FETCH_SUCCESS';
export const OCCM_GROUP_MEMBERS_FETCH_FAIL = 'OCCM_GROUP_MEMBERS_FETCH_FAIL';

export const OCCM_GROUP_PENDING_MEMBERS_FETCH_REQUEST =
  'OCCM_GROUP_PENDING_MEMBERS_FETCH_REQUEST';
export const OCCM_GROUP_PENDING_MEMBERS_FETCH_SUCCESS =
  'OCCM_GROUP_PENDING_MEMBERS_FETCH_SUCCESS';
export const OCCM_GROUP_PENDING_MEMBERS_FETCH_FAIL =
  'OCCM_GROUP_PENDING_MEMBERS_FETCH_FAIL';

export const OCCM_GROUP_JOIN_REQUEST = 'OCCM_GROUP_JOIN_REQUEST';
export const OCCM_GROUP_JOIN_SUCCESS = 'OCCM_GROUP_JOIN_SUCCESS';
export const OCCM_GROUP_JOIN_FAIL = 'OCCM_GROUP_JOIN_FAIL';

export const OCCM_GROUP_LEAVE_SUCCESS = 'OCCM_GROUP_LEAVE_SUCCESS';

export const OCCM_GROUP_MEMBER_APPROVE_SUCCESS =
  'OCCM_GROUP_MEMBER_APPROVE_SUCCESS';
export const OCCM_GROUP_MEMBER_REJECT_SUCCESS =
  'OCCM_GROUP_MEMBER_REJECT_SUCCESS';
export const OCCM_GROUP_MEMBER_REMOVE_SUCCESS =
  'OCCM_GROUP_MEMBER_REMOVE_SUCCESS';

export const fetchOccmGroups = () => (dispatch: AppDispatch) => {
  dispatch({ type: OCCM_GROUPS_FETCH_REQUEST });

  return apiGetOccmGroups()
    .then((data: ApiOccmGroupJSON[]) => {
      dispatch({ type: OCCM_GROUPS_FETCH_SUCCESS, groups: data });
      return data;
    })
    .catch((err: unknown) => {
      dispatch({ type: OCCM_GROUPS_FETCH_FAIL, error: err });
    });
};

export const fetchOccmGroup = (groupId: string) => (dispatch: AppDispatch) => {
  dispatch({ type: OCCM_GROUP_FETCH_REQUEST, id: groupId });

  return apiGetOccmGroup(groupId)
    .then((data: ApiOccmGroupJSON) => {
      dispatch({ type: OCCM_GROUP_FETCH_SUCCESS, group: data });
      return data;
    })
    .catch((err: unknown) => {
      dispatch({ type: OCCM_GROUP_FETCH_FAIL, id: groupId, error: err });
    });
};

export const createOccmGroup =
  (params: {
    title: string;
    description?: string;
    approval_required?: boolean;
  }) =>
  (dispatch: AppDispatch) => {
    return apiCreateOccmGroup(params).then((data: ApiOccmGroupJSON) => {
      dispatch({ type: OCCM_GROUP_CREATE_SUCCESS, group: data });
      return data;
    });
  };

export const updateOccmGroup =
  (
    groupId: string,
    params: {
      title?: string;
      description?: string;
      approval_required?: boolean;
    },
  ) =>
  (dispatch: AppDispatch) => {
    return apiUpdateOccmGroup(groupId, params).then(
      (data: ApiOccmGroupJSON) => {
        dispatch({ type: OCCM_GROUP_UPDATE_SUCCESS, group: data });
        return data;
      },
    );
  };

export const deleteOccmGroup = (groupId: string) => (dispatch: AppDispatch) => {
  return apiDeleteOccmGroup(groupId).then(() => {
    dispatch({ type: OCCM_GROUP_DELETE_SUCCESS, id: groupId });
  });
};

export const fetchOccmGroupMembers =
  (groupId: string) => (dispatch: AppDispatch) => {
    dispatch({ type: OCCM_GROUP_MEMBERS_FETCH_REQUEST, id: groupId });

    return apiGetOccmGroupMembers(groupId)
      .then((data: ApiOccmGroupMembershipJSON[]) => {
        dispatch({
          type: OCCM_GROUP_MEMBERS_FETCH_SUCCESS,
          id: groupId,
          members: data,
        });
        return data;
      })
      .catch((err: unknown) => {
        dispatch({
          type: OCCM_GROUP_MEMBERS_FETCH_FAIL,
          id: groupId,
          error: err,
        });
      });
  };

export const fetchOccmGroupPendingMembers =
  (groupId: string) => (dispatch: AppDispatch) => {
    dispatch({ type: OCCM_GROUP_PENDING_MEMBERS_FETCH_REQUEST, id: groupId });

    return apiGetOccmGroupPendingMembers(groupId)
      .then((data: ApiOccmGroupMembershipJSON[]) => {
        dispatch({
          type: OCCM_GROUP_PENDING_MEMBERS_FETCH_SUCCESS,
          id: groupId,
          members: data,
        });
        return data;
      })
      .catch((err: unknown) => {
        dispatch({
          type: OCCM_GROUP_PENDING_MEMBERS_FETCH_FAIL,
          id: groupId,
          error: err,
        });
      });
  };

export const joinOccmGroup = (groupId: string) => (dispatch: AppDispatch) => {
  dispatch({ type: OCCM_GROUP_JOIN_REQUEST, id: groupId });

  return apiJoinOccmGroup(groupId)
    .then((data: ApiOccmGroupMembershipJSON) => {
      dispatch({
        type: OCCM_GROUP_JOIN_SUCCESS,
        id: groupId,
        membership: data,
      });
      return data;
    })
    .catch((err: unknown) => {
      dispatch({ type: OCCM_GROUP_JOIN_FAIL, id: groupId, error: err });
    });
};

export const leaveOccmGroup = (groupId: string) => (dispatch: AppDispatch) => {
  return apiRemoveOccmGroupMember(groupId, 'me').then(() => {
    dispatch({ type: OCCM_GROUP_LEAVE_SUCCESS, id: groupId });
  });
};

export const approveOccmGroupMember =
  (groupId: string, accountId: string) => (dispatch: AppDispatch) => {
    return apiApproveOccmGroupMember(groupId, accountId).then(() => {
      dispatch({
        type: OCCM_GROUP_MEMBER_APPROVE_SUCCESS,
        id: groupId,
        accountId,
      });
    });
  };

export const rejectOccmGroupMember =
  (groupId: string, accountId: string) => (dispatch: AppDispatch) => {
    return apiRejectOccmGroupMember(groupId, accountId).then(() => {
      dispatch({
        type: OCCM_GROUP_MEMBER_REJECT_SUCCESS,
        id: groupId,
        accountId,
      });
    });
  };

export const removeOccmGroupMember =
  (groupId: string, accountId: string) => (dispatch: AppDispatch) => {
    return apiRemoveOccmGroupMember(groupId, accountId).then(() => {
      dispatch({
        type: OCCM_GROUP_MEMBER_REMOVE_SUCCESS,
        id: groupId,
        accountId,
      });
    });
  };

// expandOccmGroupTimeline is defined in actions/timelines.js following the expandListTimeline pattern
