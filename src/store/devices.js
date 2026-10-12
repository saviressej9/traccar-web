import { createSlice } from '@reduxjs/toolkit';

const { reducer, actions } = createSlice({
  name: 'devices',
  initialState: {
    items: {},
    selectedId: null,
    cardOpen: false,
    loaded: false,
  },
  reducers: {
    refresh(state, action) {
      state.items = {};
      action.payload.forEach((item) => (state.items[item.id] = item));
      state.loaded = true;
    },
    update(state, action) {
      action.payload.forEach((item) => (state.items[item.id] = item));
    },
    // Selecting a device only focuses the map on it. The status card stays closed.
    selectId(state, action) {
      state.selectTime = Date.now();
      state.selectedId = action.payload;
      state.cardOpen = false;
    },
    // Used by map markers and family bubbles, which should also open the status card.
    selectIdWithCard(state, action) {
      state.selectTime = Date.now();
      state.selectedId = action.payload;
      state.cardOpen = true;
    },
    remove(state, action) {
      delete state.items[action.payload];
    },
  },
});

export { actions as devicesActions };
export { reducer as devicesReducer };
