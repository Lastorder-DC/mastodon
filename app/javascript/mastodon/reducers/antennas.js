import { Map as ImmutableMap, List as ImmutableList, fromJS } from 'immutable';

import {
  ANTENNA_FETCH_SUCCESS,
  ANTENNA_FETCH_FAIL,
  ANTENNAS_FETCH_SUCCESS,
  ANTENNA_CREATE_SUCCESS,
  ANTENNA_UPDATE_SUCCESS,
  ANTENNA_DELETE_SUCCESS,
  ANTENNA_EDITOR_ADD_SUCCESS,
  ANTENNA_EDITOR_REMOVE_SUCCESS,
  ANTENNA_EDITOR_ADD_DOMAIN_SUCCESS,
  ANTENNA_EDITOR_REMOVE_DOMAIN_SUCCESS,
  ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_SUCCESS,
  ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_SUCCESS,
  ANTENNA_EDITOR_FETCH_DOMAINS_SUCCESS,
  ANTENNA_EDITOR_ADD_KEYWORD_SUCCESS,
  ANTENNA_EDITOR_REMOVE_KEYWORD_SUCCESS,
  ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_SUCCESS,
  ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_SUCCESS,
  ANTENNA_EDITOR_FETCH_KEYWORDS_SUCCESS,
  ANTENNA_EDITOR_ADD_TAG_SUCCESS,
  ANTENNA_EDITOR_REMOVE_TAG_SUCCESS,
  ANTENNA_EDITOR_ADD_EXCLUDE_TAG_SUCCESS,
  ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_SUCCESS,
  ANTENNA_EDITOR_FETCH_TAGS_SUCCESS,
} from '../actions/antennas';

const initialState = ImmutableMap();

const normalizeAntenna = (state, antenna) => {
  const old = state.get(antenna.id);
  if (old === false) {
    return state;
  }
  
  let s = state.set(antenna.id, fromJS(antenna));
  if (old) {
    s = s.setIn([antenna.id, 'domains'], old.get('domains'));
    s = s.setIn([antenna.id, 'exclude_domains'], old.get('exclude_domains'));
    s = s.setIn([antenna.id, 'keywords'], old.get('keywords'));
    s = s.setIn([antenna.id, 'exclude_keywords'], old.get('exclude_keywords'));
    s = s.setIn([antenna.id, 'accounts_count'], old.get('accounts_count'));
    s = s.setIn([antenna.id, 'domains_count'], old.get('domains_count'));
    s = s.setIn([antenna.id, 'keywords_count'], old.get('keywords_count'));
  }
  return s;
};

const normalizeAntennas = (state, antennas) => {
  antennas.forEach(antenna => {
    state = normalizeAntenna(state, antenna);
  });

  return state;
};

export default function antennas(state = initialState, action) {
  switch(action.type) {
  case ANTENNA_FETCH_SUCCESS:
  case ANTENNA_CREATE_SUCCESS:
  case ANTENNA_UPDATE_SUCCESS:
    return normalizeAntenna(state, action.antenna);
  case ANTENNAS_FETCH_SUCCESS:
    return normalizeAntennas(state, action.antennas);
  case ANTENNA_DELETE_SUCCESS:
  case ANTENNA_FETCH_FAIL:
    return state.set(action.id, false);
  case ANTENNA_EDITOR_ADD_SUCCESS:
    return state.setIn([action.antennaId, 'accounts_count'], state.getIn([action.antennaId, 'accounts_count']) + 1);
  case ANTENNA_EDITOR_REMOVE_SUCCESS:
    return state.setIn([action.antennaId, 'accounts_count'], state.getIn([action.antennaId, 'accounts_count']) - 1);
  case ANTENNA_EDITOR_ADD_DOMAIN_SUCCESS:
    return state.setIn([action.antennaId, 'domains_count'], state.getIn([action.antennaId, 'domains_count']) + 1).updateIn([action.antennaId, 'domains', 'domains'], domains => (ImmutableList(domains || [])).push(action.domain));
  case ANTENNA_EDITOR_REMOVE_DOMAIN_SUCCESS:
    return state.setIn([action.antennaId, 'domains_count'], state.getIn([action.antennaId, 'domains_count']) - 1).updateIn([action.antennaId, 'domains', 'domains'], domains => (ImmutableList(domains || [])).filterNot(domain => domain === action.domain));
  case ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_SUCCESS:
    return state.updateIn([action.antennaId, 'domains', 'exclude_domains'], domains => (ImmutableList(domains || [])).push(action.domain));
  case ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_SUCCESS:
    return state.updateIn([action.antennaId, 'domains', 'exclude_domains'], domains => (ImmutableList(domains || [])).filterNot(domain => domain === action.domain));
  case ANTENNA_EDITOR_FETCH_DOMAINS_SUCCESS:
    return state.setIn([action.id, 'domains'], ImmutableMap({ domains: ImmutableList(action.domains.domains), exclude_domains: ImmutableList(action.domains.exclude_domains) }));
  case ANTENNA_EDITOR_ADD_KEYWORD_SUCCESS:
    return state.setIn([action.antennaId, 'keywords_count'], state.getIn([action.antennaId, 'keywords_count']) + 1).updateIn([action.antennaId, 'keywords', 'keywords'], keywords => (ImmutableList(keywords || [])).push(action.keyword));
  case ANTENNA_EDITOR_REMOVE_KEYWORD_SUCCESS:
    return state.setIn([action.antennaId, 'keywords_count'], state.getIn([action.antennaId, 'keywords_count']) - 1).updateIn([action.antennaId, 'keywords', 'keywords'], keywords => (ImmutableList(keywords || [])).filterNot(keyword => keyword === action.keyword));
  case ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_SUCCESS:
    return state.updateIn([action.antennaId, 'keywords', 'exclude_keywords'], keywords => (ImmutableList(keywords || [])).push(action.keyword));
  case ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_SUCCESS:
    return state.updateIn([action.antennaId, 'keywords', 'exclude_keywords'], keywords => (ImmutableList(keywords || [])).filterNot(keyword => keyword === action.keyword));
  case ANTENNA_EDITOR_FETCH_KEYWORDS_SUCCESS:
    return state.setIn([action.id, 'keywords'], ImmutableMap({ keywords: ImmutableList(action.keywords.keywords), exclude_keywords: ImmutableList(action.keywords.exclude_keywords) }));
  case ANTENNA_EDITOR_ADD_TAG_SUCCESS:
    return state.setIn([action.antennaId, 'tags_count'], state.getIn([action.antennaId, 'tags_count']) + 1).updateIn([action.antennaId, 'tags', 'tags'], tags => (ImmutableList(tags || [])).push(action.tag));
  case ANTENNA_EDITOR_REMOVE_TAG_SUCCESS:
    return state.setIn([action.antennaId, 'tags_count'], state.getIn([action.antennaId, 'tags_count']) - 1).updateIn([action.antennaId, 'tags', 'tags'], tags => (ImmutableList(tags || [])).filterNot(tag => tag === action.tag));
  case ANTENNA_EDITOR_ADD_EXCLUDE_TAG_SUCCESS:
    return state.updateIn([action.antennaId, 'tags', 'exclude_tags'], tags => (ImmutableList(tags || [])).push(action.tag));
  case ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_SUCCESS:
    return state.updateIn([action.antennaId, 'tags', 'exclude_tags'], tags => (ImmutableList(tags || [])).filterNot(tag => tag === action.tag));
  case ANTENNA_EDITOR_FETCH_TAGS_SUCCESS:
    return state.setIn([action.id, 'tags'], ImmutableMap({ tags: ImmutableList(action.tags.tags), exclude_tags: ImmutableList(action.tags.exclude_tags) }));
  default:
    return state;
  }
}
