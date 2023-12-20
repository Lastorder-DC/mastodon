import { Map as ImmutableMap, fromJS, OrderedSet as ImmutableOrderedSet } from 'immutable';

import {
  BOOKMARK_CATEGORY_FETCH_SUCCESS,
  BOOKMARK_CATEGORY_FETCH_FAIL,
  BOOKMARK_CATEGORIES_FETCH_SUCCESS,
  BOOKMARK_CATEGORY_CREATE_SUCCESS,
  BOOKMARK_CATEGORY_UPDATE_SUCCESS,
  BOOKMARK_CATEGORY_DELETE_SUCCESS,
  BOOKMARK_CATEGORY_STATUSES_FETCH_REQUEST,
  BOOKMARK_CATEGORY_STATUSES_FETCH_SUCCESS,
  BOOKMARK_CATEGORY_STATUSES_FETCH_FAIL,
  BOOKMARK_CATEGORY_STATUSES_EXPAND_REQUEST,
  BOOKMARK_CATEGORY_STATUSES_EXPAND_SUCCESS,
  BOOKMARK_CATEGORY_STATUSES_EXPAND_FAIL,
  BOOKMARK_CATEGORY_EDITOR_ADD_SUCCESS,
  BOOKMARK_CATEGORY_EDITOR_REMOVE_SUCCESS,
} from '../actions/bookmark_categories';
import {
  UNBOOKMARK_SUCCESS,
} from '../actions/interactions';

const initialState = ImmutableMap();

const normalizeBookmarkCategory = (state, category) => {
  const old = state.get(category.id);
  state = state.set(category.id, fromJS(category));
  if (old) {
    state = state.setIn([category.id, 'items'], old.get('items'));
  }
  return state;
};

const normalizeBookmarkCategories = (state, bookmarkCategories) => {
  bookmarkCategories.forEach(bookmarkCategory => {
    state = normalizeBookmarkCategory(state, bookmarkCategory);
  });

  return state;
};

const normalizeBookmarkCategoryStatuses = (state, bookmarkCategoryId, statuses, next) => {
  return state.update(bookmarkCategoryId, listMap => listMap.withMutations(map => {
    map.set('next', next);
    map.set('loaded', true);
    map.set('isLoading', false);
    map.set('items', ImmutableOrderedSet(statuses.map(item => item.id)));
  }));
};

const appendToBookmarkCategoryStatuses = (state, bookmarkCategoryId, statuses, next) => {
  return appendToBookmarkCategoryStatusesById(state, bookmarkCategoryId, statuses.map(item => item.id), next);
};

const appendToBookmarkCategoryStatusesById = (state, bookmarkCategoryId, statuses, next) => {
  return state.update(bookmarkCategoryId, listMap => listMap.withMutations(map => {
    if (typeof next !== 'undefined') {
      map.set('next', next);
    }
    map.set('isLoading', false);
    if (map.get('items')) {
      map.set('items', map.get('items').union(statuses));
    }
  }));
};

const prependToBookmarkCategoryStatusesById = (state, bookmarkCategoryId, statuses) => {
  return state.update(bookmarkCategoryId, listMap => listMap.withMutations(map => {
    map.set('isLoading', false);
    if (map.get('items')) {
      map.update('items', list => ImmutableOrderedSet([statuses]).union(list));
    }
  }));
};

const removeStatusFromBookmarkCategoryById = (state, bookmarkCategoryId, status) => {
  if (state.getIn([bookmarkCategoryId, 'items'])) {
    return state.updateIn([bookmarkCategoryId, 'items'], items => items.delete(status));
  }
  return state;
};

const removeStatusFromAllBookmarkCategories = (state, status) => {
  return removeStatusFromAllBookmarkCategoriesById(state, status.get('id'));
};

const removeStatusFromAllBookmarkCategoriesById = (state, status) => {
  state.toList().forEach((bookmarkCategory) => {
    if (state.getIn([bookmarkCategory.get('id'), 'items'])) {
      state = state.updateIn([bookmarkCategory.get('id'), 'items'], items => items.delete(status));
    }
  });
  return state;
};

export default function bookmarkCategories(state = initialState, action) {
  switch(action.type) {
  case BOOKMARK_CATEGORY_FETCH_SUCCESS:
  case BOOKMARK_CATEGORY_CREATE_SUCCESS:
    return normalizeBookmarkCategory(state, action.bookmarkCategory);
  case BOOKMARK_CATEGORY_UPDATE_SUCCESS:
    return state.setIn([action.bookmarkCategory.id, 'title'], action.bookmarkCategory.title);
  case BOOKMARK_CATEGORIES_FETCH_SUCCESS:
    return normalizeBookmarkCategories(state, action.bookmarkCategories);
  case BOOKMARK_CATEGORY_DELETE_SUCCESS:
  case BOOKMARK_CATEGORY_FETCH_FAIL:
    return state.set(action.id, false);
  case BOOKMARK_CATEGORY_STATUSES_FETCH_REQUEST:
  case BOOKMARK_CATEGORY_STATUSES_EXPAND_REQUEST:
    return state.setIn([action.id, 'isLoading'], true);
  case BOOKMARK_CATEGORY_STATUSES_FETCH_FAIL:
  case BOOKMARK_CATEGORY_STATUSES_EXPAND_FAIL:
    return state.setIn([action.id, 'isLoading'], false);
  case BOOKMARK_CATEGORY_STATUSES_FETCH_SUCCESS:
    return normalizeBookmarkCategoryStatuses(state, action.id, action.statuses, action.next);
  case BOOKMARK_CATEGORY_STATUSES_EXPAND_SUCCESS:
    return appendToBookmarkCategoryStatuses(state, action.id, action.statuses, action.next);
  case BOOKMARK_CATEGORY_EDITOR_ADD_SUCCESS:
    return prependToBookmarkCategoryStatusesById(state, action.bookmarkCategoryId, action.statusId);
  case BOOKMARK_CATEGORY_EDITOR_REMOVE_SUCCESS:
    return removeStatusFromBookmarkCategoryById(state, action.bookmarkCategoryId, action.statusId);
  case UNBOOKMARK_SUCCESS:
    return removeStatusFromAllBookmarkCategories(state, action.status);
  default:
    return state;
  }
}
