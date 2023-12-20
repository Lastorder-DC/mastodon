import { Map as ImmutableMap, List as ImmutableList } from 'immutable';

import {
  BOOKMARK_CATEGORY_CREATE_REQUEST,
  BOOKMARK_CATEGORY_CREATE_FAIL,
  BOOKMARK_CATEGORY_CREATE_SUCCESS,
  BOOKMARK_CATEGORY_UPDATE_REQUEST,
  BOOKMARK_CATEGORY_UPDATE_FAIL,
  BOOKMARK_CATEGORY_UPDATE_SUCCESS,
  BOOKMARK_CATEGORY_EDITOR_RESET,
  BOOKMARK_CATEGORY_EDITOR_SETUP,
  BOOKMARK_CATEGORY_EDITOR_TITLE_CHANGE,
} from '../actions/bookmark_categories';

const initialState = ImmutableMap({
  bookmarkCategoryId: null,
  isSubmitting: false,
  isChanged: false,
  title: '',
  isExclusive: false,

  statuses: ImmutableMap({
    items: ImmutableList(),
    loaded: false,
    isLoading: false,
  }),

  suggestions: ImmutableMap({
    value: '',
    items: ImmutableList(),
  }),
});

export default function bookmarkCategoryEditorReducer(state = initialState, action) {
  switch(action.type) {
  case BOOKMARK_CATEGORY_EDITOR_RESET:
    return initialState;
  case BOOKMARK_CATEGORY_EDITOR_SETUP:
    return state.withMutations(map => {
      map.set('bookmarkCategoryId', action.bookmarkCategory.get('id'));
      map.set('title', action.bookmarkCategory.get('title'));
      map.set('isSubmitting', false);
    });
  case BOOKMARK_CATEGORY_EDITOR_TITLE_CHANGE:
    return state.withMutations(map => {
      map.set('title', action.value);
      map.set('isChanged', true);
    });
  case BOOKMARK_CATEGORY_CREATE_REQUEST:
  case BOOKMARK_CATEGORY_UPDATE_REQUEST:
    return state.withMutations(map => {
      map.set('isSubmitting', true);
      map.set('isChanged', false);
    });
  case BOOKMARK_CATEGORY_CREATE_FAIL:
  case BOOKMARK_CATEGORY_UPDATE_FAIL:
    return state.set('isSubmitting', false);
  case BOOKMARK_CATEGORY_CREATE_SUCCESS:
  case BOOKMARK_CATEGORY_UPDATE_SUCCESS:
    return state.withMutations(map => {
      map.set('isSubmitting', false);
      map.set('bookmarkCategoryId', action.bookmarkCategory.id);
    });
  default:
    return state;
  }
}
