import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { ItemProps } from '../todo/ItemProps';

const usePreferences = () => {
  const [data, setData] = useState<Record<string, ItemProps[]>>({});

  const getCounterKey = (username: string) => `counter_${username}`;

  const getNextTempId = async (username: string) => {
    const counterKey = getCounterKey(username);
    const result = await Preferences.get({ key: counterKey });
    let counter = result.value ? parseInt(result.value) : 0;
    counter += 1;
    await Preferences.set({ key: counterKey, value: counter.toString() });
    return 'temp' + counter;
  };

  const saveData = async (key: string, item: ItemProps) => {
    const result = await Preferences.get({ key });
    const currentItems = result.value ? JSON.parse(result.value) : [];

    if (!item._id) {
      item._id = await getNextTempId(key);
    }
    const index = currentItems.findIndex((i: { _id: string | undefined; }) => i._id === item._id);
    if (index !== -1) {
      currentItems[index] = item;
    } else {
      currentItems.push(item);
    }

    const dataToStore = JSON.stringify(currentItems);
    await Preferences.set({ key, value: dataToStore });
    setData({ ...data, [key]: currentItems });

    return item;
  };

  const getItemById = async (key: string, itemId: string): Promise<ItemProps | undefined> => {
    const result = await Preferences.get({ key });
    const currentItems: ItemProps[] = result.value ? JSON.parse(result.value) : [];
    return currentItems.find(item => item._id === itemId);
  };

  const removeItem = async (key: string, itemId: string) => {
    const result = await Preferences.get({ key });
    const currentItems = result.value ? JSON.parse(result.value) : [];
    const index = currentItems.findIndex((i: { _id: string | undefined; }) => i._id === itemId);

    if (index !== -1) {
      currentItems.splice(index, 1);
      const dataToStore = JSON.stringify(currentItems);
      await Preferences.set({ key, value: dataToStore });
      setData({ ...data, [key]: currentItems });
    }
  };

  const getLocalData = async (key: string): Promise<ItemProps[]> => {
    const result = await Preferences.get({ key });
    const items = result.value ? JSON.parse(result.value) : [];
    setData({ ...data, [key]: items });
    return items;
  };

  const getCounterValue = async (username: string) => {
    const counterKey = getCounterKey(username);
    const result = await Preferences.get({ key: counterKey });
    return result.value ? result.value : '0';
  };

  const resetCounter = async (username: string) => {
    const counterKey = getCounterKey(username);
    await Preferences.set({ key: counterKey, value: '0' });
  };

  return { data, saveData, getLocalData, removeItem, getCounterValue, resetCounter, getItemById };
};

export default usePreferences;
