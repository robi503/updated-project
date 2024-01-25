import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { ItemProps } from '../todo/ItemProps';

// Initialize the counter in localStorage if it doesn't exist
if (localStorage.getItem('counter') === null) {
  localStorage.setItem('counter', '0');
}

const usePreferences = () => {
  const [data, setData] = useState<Record<string, ItemProps[]>>({});

  const getNextTempId = () => {
    let counter = parseInt(localStorage.getItem('counter') || '0');
    counter += 1;
    localStorage.setItem('counter', counter.toString());
    return 'temp' + counter;
  };

  const saveData = async (key: string, item: ItemProps) => {
    const result = await Preferences.get({ key });
    const currentItems = result.value ? JSON.parse(result.value) : [];

    if (!item._id) {
      item._id = getNextTempId();
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

  const removeItem = async (key: string, itemId: string) => {
    const result = await Preferences.get({ key });
    const currentItems = result.value ? JSON.parse(result.value) : [];

    const index = currentItems.findIndex((i: { _id: string | undefined; }) => i._id === itemId);
    currentItems.splice(index, 1);

    const dataToStore = JSON.stringify(currentItems);
    await Preferences.set({ key, value: dataToStore });
    setData({ ...data, [key]: currentItems });
  };
  

  const getLocalData = async (key: string): Promise<ItemProps[]> => {
    const result = await Preferences.get({ key });
    const items = result.value ? JSON.parse(result.value) : [];
    setData({ ...data, [key]: items });
    return items;
  };

  return { data, saveData, getLocalData,removeItem };
};

export default usePreferences;
