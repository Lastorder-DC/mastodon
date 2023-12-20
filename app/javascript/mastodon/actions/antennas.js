import api from '../api';

import { showAlertForError } from './alerts';
import { importFetchedAccounts } from './importer';

export const ANTENNA_FETCH_REQUEST = 'ANTENNA_FETCH_REQUEST';
export const ANTENNA_FETCH_SUCCESS = 'ANTENNA_FETCH_SUCCESS';
export const ANTENNA_FETCH_FAIL    = 'ANTENNA_FETCH_FAIL';

export const ANTENNAS_FETCH_REQUEST = 'ANTENNAS_FETCH_REQUEST';
export const ANTENNAS_FETCH_SUCCESS = 'ANTENNAS_FETCH_SUCCESS';
export const ANTENNAS_FETCH_FAIL    = 'ANTENNAS_FETCH_FAIL';

export const ANTENNA_EDITOR_TITLE_CHANGE = 'ANTENNA_EDITOR_TITLE_CHANGE';
export const ANTENNA_EDITOR_RESET        = 'ANTENNA_EDITOR_RESET';
export const ANTENNA_EDITOR_SETUP        = 'ANTENNA_EDITOR_SETUP';

export const ANTENNA_CREATE_REQUEST = 'ANTENNA_CREATE_REQUEST';
export const ANTENNA_CREATE_SUCCESS = 'ANTENNA_CREATE_SUCCESS';
export const ANTENNA_CREATE_FAIL    = 'ANTENNA_CREATE_FAIL';

export const ANTENNA_UPDATE_REQUEST = 'ANTENNA_UPDATE_REQUEST';
export const ANTENNA_UPDATE_SUCCESS = 'ANTENNA_UPDATE_SUCCESS';
export const ANTENNA_UPDATE_FAIL    = 'ANTENNA_UPDATE_FAIL';

export const ANTENNA_DELETE_REQUEST = 'ANTENNA_DELETE_REQUEST';
export const ANTENNA_DELETE_SUCCESS = 'ANTENNA_DELETE_SUCCESS';
export const ANTENNA_DELETE_FAIL    = 'ANTENNA_DELETE_FAIL';

export const ANTENNA_ACCOUNTS_FETCH_REQUEST = 'ANTENNA_ACCOUNTS_FETCH_REQUEST';
export const ANTENNA_ACCOUNTS_FETCH_SUCCESS = 'ANTENNA_ACCOUNTS_FETCH_SUCCESS';
export const ANTENNA_ACCOUNTS_FETCH_FAIL    = 'ANTENNA_ACCOUNTS_FETCH_FAIL';

export const ANTENNA_EDITOR_SUGGESTIONS_CHANGE = 'ANTENNA_EDITOR_SUGGESTIONS_CHANGE';
export const ANTENNA_EDITOR_SUGGESTIONS_READY  = 'ANTENNA_EDITOR_SUGGESTIONS_READY';
export const ANTENNA_EDITOR_SUGGESTIONS_CLEAR  = 'ANTENNA_EDITOR_SUGGESTIONS_CLEAR';

export const ANTENNA_EDITOR_ADD_REQUEST = 'ANTENNA_EDITOR_ADD_REQUEST';
export const ANTENNA_EDITOR_ADD_SUCCESS = 'ANTENNA_EDITOR_ADD_SUCCESS';
export const ANTENNA_EDITOR_ADD_FAIL    = 'ANTENNA_EDITOR_ADD_FAIL';

export const ANTENNA_EDITOR_REMOVE_REQUEST = 'ANTENNA_EDITOR_REMOVE_REQUEST';
export const ANTENNA_EDITOR_REMOVE_SUCCESS = 'ANTENNA_EDITOR_REMOVE_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_FAIL    = 'ANTENNA_EDITOR_REMOVE_FAIL';

export const ANTENNA_EXCLUDE_ACCOUNTS_FETCH_REQUEST = 'ANTENNA_EXCLUDE_ACCOUNTS_FETCH_REQUEST';
export const ANTENNA_EXCLUDE_ACCOUNTS_FETCH_SUCCESS = 'ANTENNA_EXCLUDE_ACCOUNTS_FETCH_SUCCESS';
export const ANTENNA_EXCLUDE_ACCOUNTS_FETCH_FAIL    = 'ANTENNA_EXCLUDE_ACCOUNTS_FETCH_FAIL';

export const ANTENNA_EDITOR_ADD_EXCLUDE_REQUEST = 'ANTENNA_EDITOR_ADD_EXCLUDE_REQUEST';
export const ANTENNA_EDITOR_ADD_EXCLUDE_SUCCESS = 'ANTENNA_EDITOR_ADD_EXCLUDE_SUCCESS';
export const ANTENNA_EDITOR_ADD_EXCLUDE_FAIL    = 'ANTENNA_EDITOR_ADD_EXCLUDE_FAIL';

export const ANTENNA_EDITOR_REMOVE_EXCLUDE_REQUEST = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_REQUEST';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_SUCCESS = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_FAIL    = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_FAIL';

export const ANTENNA_EDITOR_FETCH_DOMAINS_REQUEST = 'ANTENNA_EDITOR_FETCH_DOMAINS_REQUEST';
export const ANTENNA_EDITOR_FETCH_DOMAINS_SUCCESS = 'ANTENNA_EDITOR_FETCH_DOMAINS_SUCCESS';
export const ANTENNA_EDITOR_FETCH_DOMAINS_FAIL    = 'ANTENNA_EDITOR_FETCH_DOMAINS_FAIL';

export const ANTENNA_EDITOR_ADD_DOMAIN_REQUEST = 'ANTENNA_EDITOR_ADD_DOMAIN_REQUEST';
export const ANTENNA_EDITOR_ADD_DOMAIN_SUCCESS = 'ANTENNA_EDITOR_ADD_DOMAIN_SUCCESS';
export const ANTENNA_EDITOR_ADD_DOMAIN_FAIL    = 'ANTENNA_EDITOR_ADD_DOMAIN_FAIL';

export const ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_REQUEST = 'ANTENNA_EDITOR_ADD_EXCLUDEDOMAIN_REQUEST';
export const ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_SUCCESS = 'ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_SUCCESS';
export const ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_FAIL    = 'ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_FAIL';

export const ANTENNA_EDITOR_REMOVE_DOMAIN_REQUEST = 'ANTENNA_EDITOR_REMOVE_DOMAIN_REQUEST';
export const ANTENNA_EDITOR_REMOVE_DOMAIN_SUCCESS = 'ANTENNA_EDITOR_REMOVE_DOMAIN_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_DOMAIN_FAIL    = 'ANTENNA_EDITOR_REMOVE_DOMAIN_FAIL';

export const ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_REQUEST = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_REQUEST';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_SUCCESS = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_FAIL    = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_FAIL';

export const ANTENNA_EDITOR_FETCH_KEYWORDS_REQUEST = 'ANTENNA_EDITOR_FETCH_KEYWORDS_REQUEST';
export const ANTENNA_EDITOR_FETCH_KEYWORDS_SUCCESS = 'ANTENNA_EDITOR_FETCH_KEYWORDS_SUCCESS';
export const ANTENNA_EDITOR_FETCH_KEYWORDS_FAIL    = 'ANTENNA_EDITOR_FETCH_KEYWORDS_FAIL';

export const ANTENNA_EDITOR_ADD_KEYWORD_REQUEST = 'ANTENNA_EDITOR_ADD_KEYWORD_REQUEST';
export const ANTENNA_EDITOR_ADD_KEYWORD_SUCCESS = 'ANTENNA_EDITOR_ADD_KEYWORD_SUCCESS';
export const ANTENNA_EDITOR_ADD_KEYWORD_FAIL    = 'ANTENNA_EDITOR_ADD_KEYWORD_FAIL';

export const ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_REQUEST = 'ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_REQUEST';
export const ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_SUCCESS = 'ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_SUCCESS';
export const ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_FAIL    = 'ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_FAIL';

export const ANTENNA_EDITOR_REMOVE_KEYWORD_REQUEST = 'ANTENNA_EDITOR_REMOVE_KEYWORD_REQUEST';
export const ANTENNA_EDITOR_REMOVE_KEYWORD_SUCCESS = 'ANTENNA_EDITOR_REMOVE_KEYWORD_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_KEYWORD_FAIL    = 'ANTENNA_EDITOR_REMOVE_KEYWORD_FAIL';

export const ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_REQUEST = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_REQUEST';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_SUCCESS = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_FAIL    = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_FAIL';

export const ANTENNA_EDITOR_FETCH_TAGS_REQUEST = 'ANTENNA_EDITOR_FETCH_TAGS_REQUEST';
export const ANTENNA_EDITOR_FETCH_TAGS_SUCCESS = 'ANTENNA_EDITOR_FETCH_TAGS_SUCCESS';
export const ANTENNA_EDITOR_FETCH_TAGS_FAIL    = 'ANTENNA_EDITOR_FETCH_TAGS_FAIL';

export const ANTENNA_EDITOR_ADD_TAG_REQUEST = 'ANTENNA_EDITOR_ADD_TAG_REQUEST';
export const ANTENNA_EDITOR_ADD_TAG_SUCCESS = 'ANTENNA_EDITOR_ADD_TAG_SUCCESS';
export const ANTENNA_EDITOR_ADD_TAG_FAIL    = 'ANTENNA_EDITOR_ADD_TAG_FAIL';

export const ANTENNA_EDITOR_ADD_EXCLUDE_TAG_REQUEST = 'ANTENNA_EDITOR_ADD_EXCLUDE_TAG_REQUEST';
export const ANTENNA_EDITOR_ADD_EXCLUDE_TAG_SUCCESS = 'ANTENNA_EDITOR_ADD_EXCLUDE_TAG_SUCCESS';
export const ANTENNA_EDITOR_ADD_EXCLUDE_TAG_FAIL    = 'ANTENNA_EDITOR_ADD_EXCLUDE_TAG_FAIL';

export const ANTENNA_EDITOR_REMOVE_TAG_REQUEST = 'ANTENNA_EDITOR_REMOVE_TAG_REQUEST';
export const ANTENNA_EDITOR_REMOVE_TAG_SUCCESS = 'ANTENNA_EDITOR_REMOVE_TAG_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_TAG_FAIL    = 'ANTENNA_EDITOR_REMOVE_TAG_FAIL';

export const ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_REQUEST = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_REQUEST';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_SUCCESS = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_SUCCESS';
export const ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_FAIL    = 'ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_FAIL';

export const ANTENNA_ADDER_RESET = 'ANTENNA_ADDER_RESET';
export const ANTENNA_ADDER_SETUP = 'ANTENNA_ADDER_SETUP';

export const ANTENNA_ADDER_ANTENNAS_FETCH_REQUEST = 'ANTENNA_ADDER_ANTENNAS_FETCH_REQUEST';
export const ANTENNA_ADDER_ANTENNAS_FETCH_SUCCESS = 'ANTENNA_ADDER_ANTENNAS_FETCH_SUCCESS';
export const ANTENNA_ADDER_ANTENNAS_FETCH_FAIL    = 'ANTENNA_ADDER_ANTENNAS_FETCH_FAIL';

export const ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_REQUEST = 'ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_REQUEST';
export const ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_SUCCESS = 'ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_SUCCESS';
export const ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_FAIL    = 'ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_FAIL';

export const fetchAntenna = id => (dispatch, getState) => {
  if (getState().getIn(['antennas', id])) {
    return;
  }

  dispatch(fetchAntennaRequest(id));

  api(getState).get(`/api/v1/antennas/${id}`)
    .then(({ data }) => dispatch(fetchAntennaSuccess(data)))
    .catch(err => dispatch(fetchAntennaFail(id, err)));
};

export const fetchAntennaRequest = id => ({
  type: ANTENNA_FETCH_REQUEST,
  id,
});

export const fetchAntennaSuccess = antenna => ({
  type: ANTENNA_FETCH_SUCCESS,
  antenna,
});

export const fetchAntennaFail = (id, error) => ({
  type: ANTENNA_FETCH_FAIL,
  id,
  error,
});

export const fetchAntennas = () => (dispatch, getState) => {
  dispatch(fetchAntennasRequest());

  api(getState).get('/api/v1/antennas')
    .then(({ data }) => dispatch(fetchAntennasSuccess(data)))
    .catch(err => dispatch(fetchAntennasFail(err)));
};

export const fetchAntennasRequest = () => ({
  type: ANTENNAS_FETCH_REQUEST,
});

export const fetchAntennasSuccess = antennas => ({
  type: ANTENNAS_FETCH_SUCCESS,
  antennas,
});

export const fetchAntennasFail = error => ({
  type: ANTENNAS_FETCH_FAIL,
  error,
});

export const submitAntennaEditor = shouldReset => (dispatch, getState) => {
  const antennaId = getState().getIn(['antennaEditor', 'antennaId']);
  const title  = getState().getIn(['antennaEditor', 'title']);

  if (antennaId === null) {
    dispatch(createAntenna(title, shouldReset));
  } else {
    dispatch(updateAntenna(antennaId, title, shouldReset));
  }
};

export const setupAntennaEditor = antennaId => (dispatch, getState) => {
  dispatch({
    type: ANTENNA_EDITOR_SETUP,
    antenna: getState().getIn(['antennas', antennaId]),
  });

  dispatch(fetchAntennaAccounts(antennaId));
};

export const setupExcludeAntennaEditor = antennaId => (dispatch, getState) => {
  dispatch({
    type: ANTENNA_EDITOR_SETUP,
    antenna: getState().getIn(['antennas', antennaId]),
  });

  dispatch(fetchAntennaExcludeAccounts(antennaId));
};

export const changeAntennaEditorTitle = value => ({
  type: ANTENNA_EDITOR_TITLE_CHANGE,
  value,
});

export const createAntenna = (title, shouldReset) => (dispatch, getState) => {
  dispatch(createAntennaRequest());

  api(getState).post('/api/v1/antennas', { title }).then(({ data }) => {
    dispatch(createAntennaSuccess(data));

    if (shouldReset) {
      dispatch(resetAntennaEditor());
    }
  }).catch(err => dispatch(createAntennaFail(err)));
};

export const createAntennaRequest = () => ({
  type: ANTENNA_CREATE_REQUEST,
});

export const createAntennaSuccess = antenna => ({
  type: ANTENNA_CREATE_SUCCESS,
  antenna,
});

export const createAntennaFail = error => ({
  type: ANTENNA_CREATE_FAIL,
  error,
});

export const updateAntenna = (id, title, shouldReset, list_id, stl, ltl, with_media_only, ignore_reblog, insert_feeds) => (dispatch, getState) => {
  dispatch(updateAntennaRequest(id));

  api(getState).put(`/api/v1/antennas/${id}`, { title, list_id, stl, ltl, with_media_only, ignore_reblog, insert_feeds }).then(({ data }) => {
    dispatch(updateAntennaSuccess(data));

    if (shouldReset) {
      dispatch(resetAntennaEditor());
    }
  }).catch(err => dispatch(updateAntennaFail(id, err)));
};

export const updateAntennaRequest = id => ({
  type: ANTENNA_UPDATE_REQUEST,
  id,
});

export const updateAntennaSuccess = antenna => ({
  type: ANTENNA_UPDATE_SUCCESS,
  antenna,
});

export const updateAntennaFail = (id, error) => ({
  type: ANTENNA_UPDATE_FAIL,
  id,
  error,
});

export const resetAntennaEditor = () => ({
  type: ANTENNA_EDITOR_RESET,
});

export const deleteAntenna = id => (dispatch, getState) => {
  dispatch(deleteAntennaRequest(id));

  api(getState).delete(`/api/v1/antennas/${id}`)
    .then(() => dispatch(deleteAntennaSuccess(id)))
    .catch(err => dispatch(deleteAntennaFail(id, err)));
};

export const deleteAntennaRequest = id => ({
  type: ANTENNA_DELETE_REQUEST,
  id,
});

export const deleteAntennaSuccess = id => ({
  type: ANTENNA_DELETE_SUCCESS,
  id,
});

export const deleteAntennaFail = (id, error) => ({
  type: ANTENNA_DELETE_FAIL,
  id,
  error,
});

export const fetchAntennaAccounts = antennaId => (dispatch, getState) => {
  dispatch(fetchAntennaAccountsRequest(antennaId));

  api(getState).get(`/api/v1/antennas/${antennaId}/accounts`, { params: { limit: 0 } }).then(({ data }) => {
    dispatch(importFetchedAccounts(data));
    dispatch(fetchAntennaAccountsSuccess(antennaId, data));
  }).catch(err => dispatch(fetchAntennaAccountsFail(antennaId, err)));
};

export const fetchAntennaAccountsRequest = id => ({
  type: ANTENNA_ACCOUNTS_FETCH_REQUEST,
  id,
});

export const fetchAntennaAccountsSuccess = (id, accounts, next) => ({
  type: ANTENNA_ACCOUNTS_FETCH_SUCCESS,
  id,
  accounts,
  next,
});

export const fetchAntennaAccountsFail = (id, error) => ({
  type: ANTENNA_ACCOUNTS_FETCH_FAIL,
  id,
  error,
});

export const fetchAntennaExcludeAccounts = antennaId => (dispatch, getState) => {
  dispatch(fetchAntennaExcludeAccountsRequest(antennaId));

  api(getState).get(`/api/v1/antennas/${antennaId}/exclude_accounts`, { params: { limit: 0 } }).then(({ data }) => {
    dispatch(importFetchedAccounts(data));
    dispatch(fetchAntennaExcludeAccountsSuccess(antennaId, data));
  }).catch(err => dispatch(fetchAntennaExcludeAccountsFail(antennaId, err)));
};

export const fetchAntennaExcludeAccountsRequest = id => ({
  type: ANTENNA_EXCLUDE_ACCOUNTS_FETCH_REQUEST,
  id,
});

export const fetchAntennaExcludeAccountsSuccess = (id, accounts, next) => ({
  type: ANTENNA_EXCLUDE_ACCOUNTS_FETCH_SUCCESS,
  id,
  accounts,
  next,
});

export const fetchAntennaExcludeAccountsFail = (id, error) => ({
  type: ANTENNA_EXCLUDE_ACCOUNTS_FETCH_FAIL,
  id,
  error,
});

export const fetchAntennaSuggestions = q => (dispatch, getState) => {
  const params = {
    q,
    resolve: false,
  };

  api(getState).get('/api/v1/accounts/search', { params }).then(({ data }) => {
    dispatch(importFetchedAccounts(data));
    dispatch(fetchAntennaSuggestionsReady(q, data));
  }).catch(error => dispatch(showAlertForError(error)));
};

export const fetchAntennaSuggestionsReady = (query, accounts) => ({
  type: ANTENNA_EDITOR_SUGGESTIONS_READY,
  query,
  accounts,
});

export const clearAntennaSuggestions = () => ({
  type: ANTENNA_EDITOR_SUGGESTIONS_CLEAR,
});

export const changeAntennaSuggestions = value => ({
  type: ANTENNA_EDITOR_SUGGESTIONS_CHANGE,
  value,
});

export const addToAntennaEditor = accountId => (dispatch, getState) => {
  dispatch(addToAntenna(getState().getIn(['antennaEditor', 'antennaId']), accountId));
};

export const addToAntenna = (antennaId, accountId) => (dispatch, getState) => {
  dispatch(addToAntennaRequest(antennaId, accountId));

  api(getState).post(`/api/v1/antennas/${antennaId}/accounts`, { account_ids: [accountId] })
    .then(() => dispatch(addToAntennaSuccess(antennaId, accountId)))
    .catch(err => dispatch(addToAntennaFail(antennaId, accountId, err)));
};

export const addToAntennaRequest = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_ADD_REQUEST,
  antennaId,
  accountId,
});

export const addToAntennaSuccess = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_ADD_SUCCESS,
  antennaId,
  accountId,
});

export const addToAntennaFail = (antennaId, accountId, error) => ({
  type: ANTENNA_EDITOR_ADD_FAIL,
  antennaId,
  accountId,
  error,
});

export const addExcludeToAntennaEditor = accountId => (dispatch, getState) => {
  dispatch(addExcludeToAntenna(getState().getIn(['antennaEditor', 'antennaId']), accountId));
};

export const addExcludeToAntenna = (antennaId, accountId) => (dispatch, getState) => {
  dispatch(addExcludeToAntennaRequest(antennaId, accountId));

  api(getState).post(`/api/v1/antennas/${antennaId}/exclude_accounts`, { account_ids: [accountId] })
    .then(() => dispatch(addExcludeToAntennaSuccess(antennaId, accountId)))
    .catch(err => dispatch(addExcludeToAntennaFail(antennaId, accountId, err)));
};

export const addExcludeToAntennaRequest = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_REQUEST,
  antennaId,
  accountId,
});

export const addExcludeToAntennaSuccess = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_SUCCESS,
  antennaId,
  accountId,
});

export const addExcludeToAntennaFail = (antennaId, accountId, error) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_FAIL,
  antennaId,
  accountId,
  error,
});

export const removeFromAntennaEditor = accountId => (dispatch, getState) => {
  dispatch(removeFromAntenna(getState().getIn(['antennaEditor', 'antennaId']), accountId));
};

export const removeFromAntenna = (antennaId, accountId) => (dispatch, getState) => {
  dispatch(removeFromAntennaRequest(antennaId, accountId));

  api(getState).delete(`/api/v1/antennas/${antennaId}/accounts`, { params: { account_ids: [accountId] } })
    .then(() => dispatch(removeFromAntennaSuccess(antennaId, accountId)))
    .catch(err => dispatch(removeFromAntennaFail(antennaId, accountId, err)));
};

export const removeFromAntennaRequest = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_REMOVE_REQUEST,
  antennaId,
  accountId,
});

export const removeFromAntennaSuccess = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_REMOVE_SUCCESS,
  antennaId,
  accountId,
});

export const removeFromAntennaFail = (antennaId, accountId, error) => ({
  type: ANTENNA_EDITOR_REMOVE_FAIL,
  antennaId,
  accountId,
  error,
});

export const removeExcludeFromAntennaEditor = accountId => (dispatch, getState) => {
  dispatch(removeExcludeFromAntenna(getState().getIn(['antennaEditor', 'antennaId']), accountId));
};

export const removeExcludeFromAntenna = (antennaId, accountId) => (dispatch, getState) => {
  dispatch(removeExcludeFromAntennaRequest(antennaId, accountId));

  api(getState).delete(`/api/v1/antennas/${antennaId}/exclude_accounts`, { params: { account_ids: [accountId] } })
    .then(() => dispatch(removeExcludeFromAntennaSuccess(antennaId, accountId)))
    .catch(err => dispatch(removeExcludeFromAntennaFail(antennaId, accountId, err)));
};

export const removeExcludeFromAntennaRequest = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_REQUEST,
  antennaId,
  accountId,
});

export const removeExcludeFromAntennaSuccess = (antennaId, accountId) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_SUCCESS,
  antennaId,
  accountId,
});

export const removeExcludeFromAntennaFail = (antennaId, accountId, error) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_FAIL,
  antennaId,
  accountId,
  error,
});

export const fetchAntennaDomains = antennaId => (dispatch, getState) => {
  dispatch(fetchAntennaDomainsRequest(antennaId));

  api(getState).get(`/api/v1/antennas/${antennaId}/domains`, { params: { limit: 0 } }).then(({ data }) => {
    dispatch(fetchAntennaDomainsSuccess(antennaId, data));
  }).catch(err => dispatch(fetchAntennaDomainsFail(antennaId, err)));
};

export const fetchAntennaDomainsRequest = id => ({
  type: ANTENNA_EDITOR_FETCH_DOMAINS_REQUEST,
  id,
});

export const fetchAntennaDomainsSuccess = (id, domains) => ({
  type: ANTENNA_EDITOR_FETCH_DOMAINS_SUCCESS,
  id,
  domains,
});

export const fetchAntennaDomainsFail = (id, error) => ({
  type: ANTENNA_EDITOR_FETCH_DOMAINS_FAIL,
  id,
  error,
});

export const addDomainToAntenna = (antennaId, domain) => (dispatch, getState) => {
  dispatch(addDomainToAntennaRequest(antennaId, domain));

  api(getState).post(`/api/v1/antennas/${antennaId}/domains`, { domains: [domain] })
    .then(() => dispatch(addDomainToAntennaSuccess(antennaId, domain)))
    .catch(err => dispatch(addDomainToAntennaFail(antennaId, domain, err)));
};

export const addDomainToAntennaRequest = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_ADD_DOMAIN_REQUEST,
  antennaId,
  domain,
});

export const addDomainToAntennaSuccess = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_ADD_DOMAIN_SUCCESS,
  antennaId,
  domain,
});

export const addDomainToAntennaFail = (antennaId, domain, error) => ({
  type: ANTENNA_EDITOR_ADD_DOMAIN_FAIL,
  antennaId,
  domain,
  error,
});

export const removeDomainFromAntenna = (antennaId, domain) => (dispatch, getState) => {
  dispatch(removeDomainFromAntennaRequest(antennaId, domain));

  api(getState).delete(`/api/v1/antennas/${antennaId}/domains`, { params: { domains: [domain] } })
    .then(() => dispatch(removeDomainFromAntennaSuccess(antennaId, domain)))
    .catch(err => dispatch(removeDomainFromAntennaFail(antennaId, domain, err)));
};

export const removeDomainFromAntennaRequest = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_REMOVE_DOMAIN_REQUEST,
  antennaId,
  domain,
});

export const removeDomainFromAntennaSuccess = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_REMOVE_DOMAIN_SUCCESS,
  antennaId,
  domain,
});

export const removeDomainFromAntennaFail = (antennaId, domain, error) => ({
  type: ANTENNA_EDITOR_REMOVE_DOMAIN_FAIL,
  antennaId,
  domain,
  error,
});

export const addExcludeDomainToAntenna = (antennaId, domain) => (dispatch, getState) => {
  dispatch(addExcludeDomainToAntennaRequest(antennaId, domain));

  api(getState).post(`/api/v1/antennas/${antennaId}/exclude_domains`, { domains: [domain] })
    .then(() => dispatch(addExcludeDomainToAntennaSuccess(antennaId, domain)))
    .catch(err => dispatch(addExcludeDomainToAntennaFail(antennaId, domain, err)));
};

export const addExcludeDomainToAntennaRequest = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_REQUEST,
  antennaId,
  domain,
});

export const addExcludeDomainToAntennaSuccess = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_SUCCESS,
  antennaId,
  domain,
});

export const addExcludeDomainToAntennaFail = (antennaId, domain, error) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_DOMAIN_FAIL,
  antennaId,
  domain,
  error,
});

export const removeExcludeDomainFromAntenna = (antennaId, domain) => (dispatch, getState) => {
  dispatch(removeExcludeDomainFromAntennaRequest(antennaId, domain));

  api(getState).delete(`/api/v1/antennas/${antennaId}/exclude_domains`, { params: { domains: [domain] } })
    .then(() => dispatch(removeExcludeDomainFromAntennaSuccess(antennaId, domain)))
    .catch(err => dispatch(removeExcludeDomainFromAntennaFail(antennaId, domain, err)));
};

export const removeExcludeDomainFromAntennaRequest = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_REQUEST,
  antennaId,
  domain,
});

export const removeExcludeDomainFromAntennaSuccess = (antennaId, domain) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_SUCCESS,
  antennaId,
  domain,
});

export const removeExcludeDomainFromAntennaFail = (antennaId, domain, error) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_DOMAIN_FAIL,
  antennaId,
  domain,
  error,
});

export const fetchAntennaKeywords = antennaId => (dispatch, getState) => {
  dispatch(fetchAntennaKeywordsRequest(antennaId));

  api(getState).get(`/api/v1/antennas/${antennaId}/keywords`, { params: { limit: 0 } }).then(({ data }) => {
    dispatch(fetchAntennaKeywordsSuccess(antennaId, data));
  }).catch(err => dispatch(fetchAntennaKeywordsFail(antennaId, err)));
};

export const fetchAntennaKeywordsRequest = id => ({
  type: ANTENNA_EDITOR_FETCH_KEYWORDS_REQUEST,
  id,
});

export const fetchAntennaKeywordsSuccess = (id, keywords) => ({
  type: ANTENNA_EDITOR_FETCH_KEYWORDS_SUCCESS,
  id,
  keywords,
});

export const fetchAntennaKeywordsFail = (id, error) => ({
  type: ANTENNA_EDITOR_FETCH_KEYWORDS_FAIL,
  id,
  error,
});

export const addKeywordToAntenna = (antennaId, keyword) => (dispatch, getState) => {
  dispatch(addKeywordToAntennaRequest(antennaId, keyword));

  api(getState).post(`/api/v1/antennas/${antennaId}/keywords`, { keywords: [keyword] })
    .then(() => dispatch(addKeywordToAntennaSuccess(antennaId, keyword)))
    .catch(err => dispatch(addKeywordToAntennaFail(antennaId, keyword, err)));
};

export const addKeywordToAntennaRequest = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_ADD_KEYWORD_REQUEST,
  antennaId,
  keyword,
});

export const addKeywordToAntennaSuccess = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_ADD_KEYWORD_SUCCESS,
  antennaId,
  keyword,
});

export const addKeywordToAntennaFail = (antennaId, keyword, error) => ({
  type: ANTENNA_EDITOR_ADD_KEYWORD_FAIL,
  antennaId,
  keyword,
  error,
});

export const removeKeywordFromAntenna = (antennaId, keyword) => (dispatch, getState) => {
  dispatch(removeKeywordFromAntennaRequest(antennaId, keyword));

  api(getState).delete(`/api/v1/antennas/${antennaId}/keywords`, { params: { keywords: [keyword] } })
    .then(() => dispatch(removeKeywordFromAntennaSuccess(antennaId, keyword)))
    .catch(err => dispatch(removeKeywordFromAntennaFail(antennaId, keyword, err)));
};

export const removeKeywordFromAntennaRequest = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_REMOVE_KEYWORD_REQUEST,
  antennaId,
  keyword,
});

export const removeKeywordFromAntennaSuccess = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_REMOVE_KEYWORD_SUCCESS,
  antennaId,
  keyword,
});

export const removeKeywordFromAntennaFail = (antennaId, keyword, error) => ({
  type: ANTENNA_EDITOR_REMOVE_KEYWORD_FAIL,
  antennaId,
  keyword,
  error,
});

export const addExcludeKeywordToAntenna = (antennaId, keyword) => (dispatch, getState) => {
  dispatch(addExcludeKeywordToAntennaRequest(antennaId, keyword));

  api(getState).post(`/api/v1/antennas/${antennaId}/exclude_keywords`, { keywords: [keyword] })
    .then(() => dispatch(addExcludeKeywordToAntennaSuccess(antennaId, keyword)))
    .catch(err => dispatch(addExcludeKeywordToAntennaFail(antennaId, keyword, err)));
};

export const addExcludeKeywordToAntennaRequest = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_REQUEST,
  antennaId,
  keyword,
});

export const addExcludeKeywordToAntennaSuccess = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_SUCCESS,
  antennaId,
  keyword,
});

export const addExcludeKeywordToAntennaFail = (antennaId, keyword, error) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_KEYWORD_FAIL,
  antennaId,
  keyword,
  error,
});

export const removeExcludeKeywordFromAntenna = (antennaId, keyword) => (dispatch, getState) => {
  dispatch(removeExcludeKeywordFromAntennaRequest(antennaId, keyword));

  api(getState).delete(`/api/v1/antennas/${antennaId}/exclude_keywords`, { params: { keywords: [keyword] } })
    .then(() => dispatch(removeExcludeKeywordFromAntennaSuccess(antennaId, keyword)))
    .catch(err => dispatch(removeExcludeKeywordFromAntennaFail(antennaId, keyword, err)));
};

export const removeExcludeKeywordFromAntennaRequest = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_REQUEST,
  antennaId,
  keyword,
});

export const removeExcludeKeywordFromAntennaSuccess = (antennaId, keyword) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_SUCCESS,
  antennaId,
  keyword,
});

export const removeExcludeKeywordFromAntennaFail = (antennaId, keyword, error) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_KEYWORD_FAIL,
  antennaId,
  keyword,
  error,
});

export const fetchAntennaTags = antennaId => (dispatch, getState) => {
  dispatch(fetchAntennaTagsRequest(antennaId));

  api(getState).get(`/api/v1/antennas/${antennaId}/tags`, { params: { limit: 0 } }).then(({ data }) => {
    dispatch(fetchAntennaTagsSuccess(antennaId, data));
  }).catch(err => dispatch(fetchAntennaTagsFail(antennaId, err)));
};

export const fetchAntennaTagsRequest = id => ({
  type: ANTENNA_EDITOR_FETCH_TAGS_REQUEST,
  id,
});

export const fetchAntennaTagsSuccess = (id, tags) => ({
  type: ANTENNA_EDITOR_FETCH_TAGS_SUCCESS,
  id,
  tags,
});

export const fetchAntennaTagsFail = (id, error) => ({
  type: ANTENNA_EDITOR_FETCH_TAGS_FAIL,
  id,
  error,
});

export const addTagToAntenna = (antennaId, tag) => (dispatch, getState) => {
  dispatch(addTagToAntennaRequest(antennaId, tag));

  api(getState).post(`/api/v1/antennas/${antennaId}/tags`, { tags: [tag] })
    .then(() => dispatch(addTagToAntennaSuccess(antennaId, tag)))
    .catch(err => dispatch(addTagToAntennaFail(antennaId, tag, err)));
};

export const addTagToAntennaRequest = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_ADD_TAG_REQUEST,
  antennaId,
  tag,
});

export const addTagToAntennaSuccess = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_ADD_TAG_SUCCESS,
  antennaId,
  tag,
});

export const addTagToAntennaFail = (antennaId, tag, error) => ({
  type: ANTENNA_EDITOR_ADD_TAG_FAIL,
  antennaId,
  tag,
  error,
});

export const removeTagFromAntenna = (antennaId, tag) => (dispatch, getState) => {
  dispatch(removeTagFromAntennaRequest(antennaId, tag));

  api(getState).delete(`/api/v1/antennas/${antennaId}/tags`, { params: { tags: [tag] } })
    .then(() => dispatch(removeTagFromAntennaSuccess(antennaId, tag)))
    .catch(err => dispatch(removeTagFromAntennaFail(antennaId, tag, err)));
};

export const removeTagFromAntennaRequest = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_REMOVE_TAG_REQUEST,
  antennaId,
  tag,
});

export const removeTagFromAntennaSuccess = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_REMOVE_TAG_SUCCESS,
  antennaId,
  tag,
});

export const removeTagFromAntennaFail = (antennaId, tag, error) => ({
  type: ANTENNA_EDITOR_REMOVE_TAG_FAIL,
  antennaId,
  tag,
  error,
});

export const addExcludeTagToAntenna = (antennaId, tag) => (dispatch, getState) => {
  dispatch(addExcludeTagToAntennaRequest(antennaId, tag));

  api(getState).post(`/api/v1/antennas/${antennaId}/exclude_tags`, { tags: [tag] })
    .then(() => dispatch(addExcludeTagToAntennaSuccess(antennaId, tag)))
    .catch(err => dispatch(addExcludeTagToAntennaFail(antennaId, tag, err)));
};

export const addExcludeTagToAntennaRequest = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_TAG_REQUEST,
  antennaId,
  tag,
});

export const addExcludeTagToAntennaSuccess = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_TAG_SUCCESS,
  antennaId,
  tag,
});

export const addExcludeTagToAntennaFail = (antennaId, tag, error) => ({
  type: ANTENNA_EDITOR_ADD_EXCLUDE_TAG_FAIL,
  antennaId,
  tag,
  error,
});

export const removeExcludeTagFromAntenna = (antennaId, tag) => (dispatch, getState) => {
  dispatch(removeExcludeTagFromAntennaRequest(antennaId, tag));

  api(getState).delete(`/api/v1/antennas/${antennaId}/exclude_tags`, { params: { tags: [tag] } })
    .then(() => dispatch(removeExcludeTagFromAntennaSuccess(antennaId, tag)))
    .catch(err => dispatch(removeExcludeTagFromAntennaFail(antennaId, tag, err)));
};

export const removeExcludeTagFromAntennaRequest = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_REQUEST,
  antennaId,
  tag,
});

export const removeExcludeTagFromAntennaSuccess = (antennaId, tag) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_SUCCESS,
  antennaId,
  tag,
});

export const removeExcludeTagFromAntennaFail = (antennaId, tag, error) => ({
  type: ANTENNA_EDITOR_REMOVE_EXCLUDE_TAG_FAIL,
  antennaId,
  tag,
  error,
});

export const resetAntennaAdder = () => ({
  type: ANTENNA_ADDER_RESET,
});

export const setupAntennaAdder = accountId => (dispatch, getState) => {
  dispatch({
    type: ANTENNA_ADDER_SETUP,
    account: getState().getIn(['accounts', accountId]),
  });
  dispatch(fetchAntennas());
  dispatch(fetchAccountAntennas(accountId));
};

export const setupExcludeAntennaAdder = accountId => (dispatch, getState) => {
  dispatch({
    type: ANTENNA_ADDER_SETUP,
    account: getState().getIn(['accounts', accountId]),
  });
  dispatch(fetchAntennas());
  dispatch(fetchExcludeAccountAntennas(accountId));
};

export const fetchAccountAntennas = accountId => (dispatch, getState) => {
  dispatch(fetchAccountAntennasRequest(accountId));

  api(getState).get(`/api/v1/accounts/${accountId}/antennas`)
    .then(({ data }) => dispatch(fetchAccountAntennasSuccess(accountId, data)))
    .catch(err => dispatch(fetchAccountAntennasFail(accountId, err)));
};

export const fetchAccountAntennasRequest = id => ({
  type:ANTENNA_ADDER_ANTENNAS_FETCH_REQUEST,
  id,
});

export const fetchAccountAntennasSuccess = (id, antennas) => ({
  type: ANTENNA_ADDER_ANTENNAS_FETCH_SUCCESS,
  id,
  antennas,
});

export const fetchAccountAntennasFail = (id, err) => ({
  type: ANTENNA_ADDER_ANTENNAS_FETCH_FAIL,
  id,
  err,
});

export const fetchExcludeAccountAntennas = accountId => (dispatch, getState) => {
  dispatch(fetchExcludeAccountAntennasRequest(accountId));

  api(getState).get(`/api/v1/accounts/${accountId}/exclude_antennas`)
    .then(({ data }) => dispatch(fetchExcludeAccountAntennasSuccess(accountId, data)))
    .catch(err => dispatch(fetchExcludeAccountAntennasFail(accountId, err)));
};

export const fetchExcludeAccountAntennasRequest = id => ({
  type:ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_REQUEST,
  id,
});

export const fetchExcludeAccountAntennasSuccess = (id, antennas) => ({
  type: ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_SUCCESS,
  id,
  antennas,
});

export const fetchExcludeAccountAntennasFail = (id, err) => ({
  type: ANTENNA_ADDER_EXCLUDE_ANTENNAS_FETCH_FAIL,
  id,
  err,
});

export const addToAntennaAdder = antennaId => (dispatch, getState) => {
  dispatch(addToAntenna(antennaId, getState().getIn(['antennaAdder', 'accountId'])));
};

export const removeFromAntennaAdder = antennaId => (dispatch, getState) => {
  dispatch(removeFromAntenna(antennaId, getState().getIn(['antennaAdder', 'accountId'])));
};

export const addExcludeToAntennaAdder = antennaId => (dispatch, getState) => {
  dispatch(addExcludeToAntenna(antennaId, getState().getIn(['antennaAdder', 'accountId'])));
};

export const removeExcludeFromAntennaAdder = antennaId => (dispatch, getState) => {
  dispatch(removeExcludeFromAntenna(antennaId, getState().getIn(['antennaAdder', 'accountId'])));
};

