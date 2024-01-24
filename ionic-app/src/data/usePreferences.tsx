import { useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { ItemProps } from '../todo/ItemProps';


const usePreferences = () => {
  const [data, setData] = useState<Record<string, ItemProps[]>>({});

  const saveData = async (key: string, item: ItemProps) => {
    // Retrieve existing items from local storage
    const result = await Preferences.get({ key });
    const currentItems = result.value ? JSON.parse(result.value) : [];
  
    // Check if the item should be updated or added
    const index = currentItems.findIndex((i: { _id: string | undefined; }) => i._id === item._id);
    if (index !== -1) {
      // Update existing item
      currentItems[index] = item;
    } else {
      // Add new item
      currentItems.push(item);
    }
  
    // Save the updated array to local storage
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


  return { data, saveData, getLocalData };
};

export default usePreferences;
