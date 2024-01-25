import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { ItemProps } from './ItemProps';
import { createItem, getItems, newWebSocket, updateItem } from './itemApi';
import { AuthContext } from '../auth';
import { useNetwork } from '../net/useNetwork';
import usePreferences from '../data/usePreferences';

const log = getLogger('ItemProvider');

type SaveItemFn = (item: ItemProps) => Promise<any>;

export interface ItemsState {
  items?: ItemProps[],
  fetching: boolean,
  fetchingError?: Error | null,
  syncing: boolean,
  syncingError?: Error | null,
  saving: boolean,
  savingError?: Error | null,
  saveItem?: SaveItemFn,
}

interface ActionProps {
  type: string,
  payload?: any,
}

const initialState: ItemsState = {
  fetching: false,
  saving: false,
  syncing: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SYNC_ITEMS_STARTED = 'SYNC_ITEMS_STARTED';
const SYNC_ITEMS_SUCCEEDED = 'SYNC_ITEMS_SUCCEEDED';
const SYNC_ITEMS_FAILED = 'SYNC_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';

const reducer: (state: ItemsState, action: ActionProps) => ItemsState =
  (state, { type, payload }) => {
    switch (type) {
      case FETCH_ITEMS_STARTED:
        return { ...state, fetching: true, fetchingError: null };
      case FETCH_ITEMS_SUCCEEDED:
        return { ...state, items: payload.items, fetching: false };
      case FETCH_ITEMS_FAILED:
        return { ...state, fetchingError: payload.error, fetching: false };
      case SYNC_ITEMS_STARTED:
        return { ...state, syncing: true, syncingError: null };
      case SYNC_ITEMS_SUCCEEDED:
        return { ...state, items: payload.items, syncing: false };
      case SYNC_ITEMS_FAILED:
        return { ...state, syncingError: payload.error, syncing: false };
      case SAVE_ITEM_STARTED:
        return { ...state, savingError: null, saving: true };
      case SAVE_ITEM_SUCCEEDED:
        const items = [...(state.items || [])];
        const item = payload.item;
        const index = items.findIndex(it => it._id === item._id);
        if (index === -1) {
          items.splice(0, 0, item);
        } else {
          items[index] = item;
        }
        return { ...state, items, saving: false };
      case SAVE_ITEM_FAILED:
        return { ...state, savingError: payload.error, saving: false };
      default:
        return state;
    }
  };

export const ItemContext = React.createContext<ItemsState>(initialState);

interface ItemProviderProps {
  children: PropTypes.ReactNodeLike,
}

export const ItemProvider: React.FC<ItemProviderProps> = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { items, fetching, fetchingError, syncing, syncingError, saving, savingError } = state;
  const { networkStatus } = useNetwork();
  const { getLocalData, saveData, removeItem, getCounterValue, resetCounter } = usePreferences();
  useEffect(getItemsEffect, [token, networkStatus]);
  useEffect(wsEffect, [token]);
  const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token, networkStatus]);
  const value = { items, fetching, fetchingError, syncing, syncingError, saving, savingError, saveItem };
  log('returns');
  return (
    <ItemContext.Provider value={value}>
      {children}
    </ItemContext.Provider>
  );

  function getItemsEffect() {
    let canceled = false;
    if (token) {
      fetchItems();
    }
    return () => {
      canceled = true;
    }

    async function fetchItems() {  
      const username = localStorage.getItem('username');
      const localItems = username ? await getLocalData(username) : [];
      if (!networkStatus.connected){
        try{
          log('fetchItems started locally');
          dispatch({ type: FETCH_ITEMS_STARTED });
          const items = localItems;
          dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
        }catch (error) {
          log('fetchItems locally failed', error);
          dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
        }
      }      
      else{
        try {
          log('fetchItems started');
          dispatch({ type: FETCH_ITEMS_STARTED });
          let items = await getItems(token);
          if(username){
            log('fetchItems succeeded');
            const counterValue = await getCounterValue(username);
            if(counterValue != '0'){
                syncItems(localItems, items, username);   
            }
          }
          if (!canceled) {
            dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items } });
          }
        } catch (error) {
          log('fetchItems failed', error);
          dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
        }
      }
    }
  }

  async function syncItems(localItems: ItemProps[], items: ItemProps[], username: string) {
    try {
      dispatch({ type: SYNC_ITEMS_STARTED });
      log('syncing started');
  
      for (const localItem of localItems) {
        if (localItem._id && localItem._id.startsWith('temp')) {
          if (username) {
            await removeItem(username, localItem._id);
          }
          const itemToSave = { ...localItem, _id: undefined };
          const savedItem = await saveItemCallback(itemToSave);
          if(savedItem)
            items.push(savedItem);
        }
      }
      resetCounter(username);
      log('syncing completed');
      dispatch({ type: SYNC_ITEMS_SUCCEEDED, payload: { items } });
      return items;
    } catch (error) {
      log('syncing failed', error);
      dispatch({ type: SYNC_ITEMS_FAILED, payload: { error } });
    }
  }
  

  async function saveItemCallback(item: ItemProps) {
    if(networkStatus.connected){
      try {
        log('saveItem started');
        dispatch({ type: SAVE_ITEM_STARTED });
        const savedItem = await (item._id ? updateItem(token, item) : createItem(token, item));
        item._id = savedItem._id;
        log('saveItem succeeded');
        dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item } });
      } catch (error) {
        log('saveItem failed');
        dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
      }
    }
    try{
      log('saveItem started locally');
      dispatch({ type: SAVE_ITEM_STARTED });
      const username = localStorage.getItem('username');
      const savedItem = username ? await saveData(username, item) : null;
      if (savedItem) {
        log('saveItem locally succeeded');
        dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { item: savedItem } });
        return savedItem;
      } else {
        log('saveItem locally failed');
      }
    }catch (error) {
      log('saveItem locally failed', error);
      dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
    }
  }


  function wsEffect() {
    let canceled = false;
    log('wsEffect - connecting');
    let closeWebSocket: () => void;
    if (token?.trim()) {
      closeWebSocket = newWebSocket(token, message => {
        if (canceled) {
          return;
        }
        const { type, payload: item } = message;
        log(`ws message, item ${type}`);
        if (type === 'created' || type === 'updated') {
        }
      });
    }
    return () => {
      log('wsEffect - disconnecting');
      canceled = true;
      closeWebSocket?.();
    }
  }
};
