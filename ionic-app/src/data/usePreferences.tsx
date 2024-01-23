import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';

export interface ItemProps {
  _id?: string;
  text: string;
}

const usePreferences = () => {
  const [data, setData] = useState<Record<string, ItemProps[]>>({});

  const saveData = async (key: string, items: ItemProps[]) => {
    const dataToStore = JSON.stringify(items);
    await Preferences.set({ key, value: dataToStore });
    setData({ ...data, [key]: items });
  };

  const getData = async (key: string): Promise<ItemProps[]> => {
    const result = await Preferences.get({ key });
    const items = result.value ? JSON.parse(result.value) : [];
    setData({ ...data, [key]: items });
    return items;
  };

  const removeObject = async (key: string, objectId: string) => {
    const currentItems = data[key] || [];
    const updatedItems = currentItems.filter(item => item._id !== objectId);
    await saveData(key, updatedItems);
  };

  return { data, saveData, getData, removeObject };
};

export default usePreferences;
