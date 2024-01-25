import React, { useCallback, useContext, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { ItemProps } from './ItemProps';
import { createItem, deleteItemApi, getItems, newWebSocket, updateItem } from './itemApi';
import { AuthContext } from '../auth';
import { useNetwork } from '../net/useNetwork';
import usePreferences from '../data/usePreferences';

const log = getLogger('ItemProvider');

type SaveItemFn = (item: ItemProps) => Promise<any>;
type DeleteItemFn = (id: string) => Promise<any>;

export interface ItemsState {
  items?: ItemProps[],
  fetching: boolean,
  fetchingError?: Error | null,
  syncing: boolean,
  syncingError?: Error | null,
  saving: boolean,
  savingError?: Error | null,
  saveItem?: SaveItemFn,
  deleteItem?: DeleteItemFn,
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
const DELETE_ITEM_STARTED = 'DELETE_ITEM_STARTED';
const DELETE_ITEM_SUCCEEDED = 'DELETE_ITEM_SUCCEEDED';
const DELETE_ITEM_FAILED = 'DELETE_ITEM_FAILED';

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
      case DELETE_ITEM_STARTED:
          return { ...state, savingError: null, saving: true };
      case DELETE_ITEM_SUCCEEDED:
        if (!payload.itemId) {
          console.error('DELETE_ITEM_SUCCEEDED called without a valid itemId in payload');
          return state;
        }
        if(state.items){
        const updatedItems = state.items.filter(item => item && item._id !== payload.itemId);
        return { ...state, items: updatedItems, saving: false };
        }        
      case DELETE_ITEM_FAILED:
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
  const { getLocalData, saveData, removeItem, getCounterValue, resetCounter, getItemById } = usePreferences();
  useEffect(getItemsEffect, [token, networkStatus]);
  useEffect(wsEffect, [token]);
  const saveItem = useCallback<SaveItemFn>(saveItemCallback, [token, networkStatus]);
  const deleteItem = useCallback<DeleteItemFn>(deleteItemCallback, [token, networkStatus]);
  const value = { items, fetching, fetchingError, syncing, syncingError, saving, savingError, saveItem, deleteItem };
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
            syncItems(localItems, items, username);   
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

      for (const serverItem of items) {
        if (serverItem._id) {
          const localItem = await getItemById(username, serverItem._id);
          if (!localItem) {
            await deleteItemCallback(serverItem._id);
            items = items.filter(item => item && item._id !== serverItem._id);
          }
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

  async function deleteItemCallback(itemId: string) {
    dispatch({ type: DELETE_ITEM_STARTED });
    let deletedOnServer = false;
  
    if (networkStatus.connected) {
      try {
        log('deleteItem started on server');
        await deleteItemApi(token, itemId); // Assuming deleteItemApi is your API call to delete the item on the server
        log('deleteItem succeeded on server');
        deletedOnServer = true;
      } catch (error) {
        log('deleteItem failed on server', error);
        dispatch({ type: DELETE_ITEM_FAILED, payload: { error } });
        return; // Exit if the server-side deletion fails
      }
    }
  
    try {
      log('deleteItem started locally');
      const username = localStorage.getItem('username');
      if (username) {
        await removeItem(username, itemId); // Assuming removeItem is your function to remove the item locally
        log('deleteItem locally succeeded');
        // Dispatch succeeded only after both server and local deletions are handled
        dispatch({ type: DELETE_ITEM_SUCCEEDED, payload: { itemId } });
      } else {
        log('deleteItem locally failed: No username found');
        if (!deletedOnServer) {
          // Dispatch failed if not deleted on server and no username found
          dispatch({ type: DELETE_ITEM_FAILED, payload: { error: new Error('No username found for local deletion') } });
        }
      }
    } catch (error) {
      log('deleteItem locally failed', error);
      dispatch({ type: DELETE_ITEM_FAILED, payload: { error } });
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
      });
    }
    return () => {
      log('wsEffect - disconnecting');
      canceled = true;
      closeWebSocket?.();
    }
  }
};
