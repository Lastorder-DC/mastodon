import type { Reducer } from '@reduxjs/toolkit';
import { Map as ImmutableMap, fromJS } from 'immutable';

import type { ApiOccmGroupJSON } from 'mastodon/api_types/occm_groups';

import {
  OCCM_GROUPS_FETCH_SUCCESS,
  OCCM_GROUP_FETCH_SUCCESS,
  OCCM_GROUP_FETCH_FAIL,
  OCCM_GROUP_CREATE_SUCCESS,
  OCCM_GROUP_UPDATE_SUCCESS,
  OCCM_GROUP_DELETE_SUCCESS,
  OCCM_GROUP_JOIN_SUCCESS,
} from '../actions/occm_groups';

const initialState = ImmutableMap<string, ReturnType<typeof fromJS> | null>();
type State = typeof initialState;

const normalizeGroup = (state: State, group: ApiOccmGroupJSON) =>
  state.set(group.id, fromJS(group));

const normalizeGroups = (state: State, groups: ApiOccmGroupJSON[]) => {
  groups.forEach((group) => {
    state = normalizeGroup(state, group);
  });

  return state;
};

export const occmGroupsReducer: Reducer<State> = (
  state = initialState,
  action,
) => {
  switch (action.type) {
    case OCCM_GROUPS_FETCH_SUCCESS:
      return normalizeGroups(state, action.groups as ApiOccmGroupJSON[]);
    case OCCM_GROUP_FETCH_SUCCESS:
    case OCCM_GROUP_CREATE_SUCCESS:
    case OCCM_GROUP_UPDATE_SUCCESS:
      return normalizeGroup(state, action.group as ApiOccmGroupJSON);
    case OCCM_GROUP_DELETE_SUCCESS:
    case OCCM_GROUP_FETCH_FAIL:
      return state.set(action.id as string, null);
    case OCCM_GROUP_JOIN_SUCCESS:
      return state.updateIn(
        [action.id as string, 'membership_state'],
        () => (action.membership as { state: string }).state,
      );
    default:
      return state;
  }
};
