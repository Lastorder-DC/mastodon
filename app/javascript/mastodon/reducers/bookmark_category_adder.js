import { Map as ImmutableMap, List as ImmutableList } from 'immutable';

import {
  BOOKMARK_CATEGORY_ADDER_RESET,
  BOOKMARK_CATEGORY_ADDER_SETUP,
  BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_REQUEST,
  BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_SUCCESS,
  BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_FAIL,
  BOOKMARK_CATEGORY_EDITOR_ADD_SUCCESS,
  BOOKMARK_CATEGORY_EDITOR_REMOVE_SUCCESS,
} from '../actions/bookmark_categories';
import {
  UNBOOKMARK_SUCCESS,
} from '../actions/interactions';

const initialState = ImmutableMap({
  statusId: null,

  bookmarkCategories: ImmutableMap({
    items: ImmutableList(),
    loaded: false,
    isLoading: false,
  }),
});

export default function bookmarkCategoryAdderReducer(state = initialState, action) {
  switch(action.type) {
  case BOOKMARK_CATEGORY_ADDER_RESET:
    return initialState;
  case BOOKMARK_CATEGORY_ADDER_SETUP:
    return state.withMutations(map => {
      map.set('statusId', action.status.get('id'));
    });
  case BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_REQUEST:
    return state.setIn(['bookmarkCategories', 'isLoading'], true);
  case BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_FAIL:
    return state.setIn(['bookmarkCategories', 'isLoading'], false);
  case BOOKMARK_CATEGORY_ADDER_BOOKMARK_CATEGORIES_FETCH_SUCCESS:
    return state.update('bookmarkCategories', bookmarkCategories => bookmarkCategories.withMutations(map => {
      map.set('isLoading', false);
      map.set('loaded', true);
      map.set('items', ImmutableList(action.bookmarkCategories.map(item => item.id)));
    }));
  case BOOKMARK_CATEGORY_EDITOR_ADD_SUCCESS:
    return state.updateIn(['bookmarkCategories', 'items'], bookmarkCategory => bookmarkCategory.unshift(action.bookmarkCategoryId));
  case BOOKMARK_CATEGORY_EDITOR_REMOVE_SUCCESS:
    return state.updateIn(['bookmarkCategories', 'items'], bookmarkCategory => bookmarkCategory.filterNot(item => item === action.bookmarkCategoryId));
  case UNBOOKMARK_SUCCESS:
    return action.status.get('id') === state.get('statusId') ? state.setIn(['bookmarkCategories', 'items'], ImmutableList()) : state;
  default:
    return state;
  }
}
