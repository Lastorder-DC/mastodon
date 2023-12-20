import { List as ImmutableList, fromJS as ConvertToImmutable } from 'immutable';

import { REACTION_DECK_FETCH_SUCCESS, REACTION_DECK_UPDATE_SUCCESS } from '../actions/reaction_deck';

const initialState = ImmutableList([]);

export default function reaction_deck(state = initialState, action) {
  if(action.type === REACTION_DECK_FETCH_SUCCESS || action.type === REACTION_DECK_UPDATE_SUCCESS) {
    state = ConvertToImmutable(action.emojis);
  }

  return state;
}
