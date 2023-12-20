import { Map as ImmutableMap, List as ImmutableList } from 'immutable';

import {
  ANTENNA_CREATE_REQUEST,
  ANTENNA_CREATE_FAIL,
  ANTENNA_CREATE_SUCCESS,
  ANTENNA_UPDATE_REQUEST,
  ANTENNA_UPDATE_FAIL,
  ANTENNA_UPDATE_SUCCESS,
  ANTENNA_EDITOR_RESET,
  ANTENNA_EDITOR_SETUP,
  ANTENNA_EDITOR_TITLE_CHANGE,
  ANTENNA_ACCOUNTS_FETCH_REQUEST,
  ANTENNA_ACCOUNTS_FETCH_SUCCESS,
  ANTENNA_ACCOUNTS_FETCH_FAIL,
  ANTENNA_EXCLUDE_ACCOUNTS_FETCH_REQUEST,
  ANTENNA_EXCLUDE_ACCOUNTS_FETCH_SUCCESS,
  ANTENNA_EXCLUDE_ACCOUNTS_FETCH_FAIL,
  ANTENNA_EDITOR_SUGGESTIONS_READY,
  ANTENNA_EDITOR_SUGGESTIONS_CLEAR,
  ANTENNA_EDITOR_SUGGESTIONS_CHANGE,
  ANTENNA_EDITOR_ADD_SUCCESS,
  ANTENNA_EDITOR_REMOVE_SUCCESS,
  ANTENNA_EDITOR_ADD_EXCLUDE_SUCCESS,
  ANTENNA_EDITOR_REMOVE_EXCLUDE_SUCCESS,
} from '../actions/antennas';

const initialState = ImmutableMap({
  antennaId: null,
  isSubmitting: false,
  isChanged: false,
  title: '',
  accountsCount: 0,

  accounts: ImmutableMap({
    items: ImmutableList(),
    loaded: false,
    isLoading: false,
  }),

  suggestions: ImmutableMap({
    value: '',
    items: ImmutableList(),
  }),
});

export default function antennaEditorReducer(state = initialState, action) {
  switch(action.type) {
  case ANTENNA_EDITOR_RESET:
    return initialState;
  case ANTENNA_EDITOR_SETUP:
    return state.withMutations(map => {
      map.set('antennaId', action.antenna.get('id'));
      map.set('title', action.antenna.get('title'));
      map.set('accountsCount', action.antenna.get('accounts_count'));
      map.set('isSubmitting', false);
    });
  case ANTENNA_EDITOR_TITLE_CHANGE:
    return state.withMutations(map => {
      map.set('title', action.value);
      map.set('isChanged', true);
    });
  case ANTENNA_CREATE_REQUEST:
  case ANTENNA_UPDATE_REQUEST:
    return state.withMutations(map => {
      map.set('isSubmitting', true);
      map.set('isChanged', false);
    });
  case ANTENNA_CREATE_FAIL:
  case ANTENNA_UPDATE_FAIL:
    return state.set('isSubmitting', false);
  case ANTENNA_CREATE_SUCCESS:
  case ANTENNA_UPDATE_SUCCESS:
    return state.withMutations(map => {
      map.set('isSubmitting', false);
      map.set('antennaId', action.antenna.id);
    });
  case ANTENNA_ACCOUNTS_FETCH_REQUEST:
    return state.setIn(['accounts', 'isLoading'], true);
  case ANTENNA_ACCOUNTS_FETCH_FAIL:
    return state.setIn(['accounts', 'isLoading'], false);
  case ANTENNA_ACCOUNTS_FETCH_SUCCESS:
    return state.update('accounts', accounts => accounts.withMutations(map => {
      map.set('isLoading', false);
      map.set('loaded', true);
      map.set('items', ImmutableList(action.accounts.map(item => item.id)));
    }));
  case ANTENNA_EXCLUDE_ACCOUNTS_FETCH_REQUEST:
    return state.setIn(['accounts', 'isLoading'], true);
  case ANTENNA_EXCLUDE_ACCOUNTS_FETCH_FAIL:
    return state.setIn(['accounts', 'isLoading'], false);
  case ANTENNA_EXCLUDE_ACCOUNTS_FETCH_SUCCESS:
    return state.update('accounts', accounts => accounts.withMutations(map => {
      map.set('isLoading', false);
      map.set('loaded', true);
      map.set('items', ImmutableList(action.accounts.map(item => item.id)));
    }));
  case ANTENNA_EDITOR_SUGGESTIONS_CHANGE:
    return state.setIn(['suggestions', 'value'], action.value);
  case ANTENNA_EDITOR_SUGGESTIONS_READY:
    return state.setIn(['suggestions', 'items'], ImmutableList(action.accounts.map(item => item.id)));
  case ANTENNA_EDITOR_SUGGESTIONS_CLEAR:
    return state.update('suggestions', suggestions => suggestions.withMutations(map => {
      map.set('items', ImmutableList());
      map.set('value', '');
    }));
  case ANTENNA_EDITOR_ADD_SUCCESS:
  case ANTENNA_EDITOR_ADD_EXCLUDE_SUCCESS:
    return state.updateIn(['accounts', 'items'], antenna => antenna.unshift(action.accountId));
  case ANTENNA_EDITOR_REMOVE_SUCCESS:
  case ANTENNA_EDITOR_REMOVE_EXCLUDE_SUCCESS:
    return state.updateIn(['accounts', 'items'], antenna => antenna.filterNot(item => item === action.accountId));
  default:
    return state;
  }
}
