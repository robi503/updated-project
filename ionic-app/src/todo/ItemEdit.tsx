import React, { useContext, useEffect, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLoading,
  IonPage,
  IonTitle,
  IonFab,
  IonFabButton,
  IonIcon,
  IonToolbar,
  IonImg
} from '@ionic/react';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { RouteComponentProps } from 'react-router';
import { ItemProps } from './ItemProps';
import { camera, map } from 'ionicons/icons';
import { useCamera } from './useCamera';
import { useFilesystem } from './useFileSystem';
import { Coordinates, useMyLocation } from '../location/useMyLocation';
import MyMap from '../location/MyMap';


const log = getLogger('ItemEdit');

interface ItemEditProps extends RouteComponentProps<{
  id?: string;
}> {}

export interface MyPhoto {
  filepath: string;
  webviewPath?: string;
}

const ItemEdit: React.FC<ItemEditProps> = ({ history, match }) => {
  const { items, saving, savingError, saveItem, deleteItem } = useContext(ItemContext);
  const { getPhoto } = useCamera();
  const { writeFile, deleteFile } = useFilesystem();
  const [text, setText] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [photo, setPhoto] = useState<MyPhoto>();
  const [item, setItem] = useState<ItemProps>();
  const [currentMapCenter, setCurrentMapCenter] = useState<Coordinates>();
  const { coordinates } = useMyLocation();
  const [markerCoordinates, setCoordinates] = useState<Coordinates>();
  const toggleMap = () => {
    setShowMap(!showMap);
  };
  useEffect(() => {
    if (markerCoordinates) {
      setCurrentMapCenter(markerCoordinates);
    } else if (item?.coordinates) {
      setCurrentMapCenter(item.coordinates);
    } else {
      if(coordinates)
        setCurrentMapCenter(coordinates);
    }
  }, [markerCoordinates, item?.coordinates, coordinates]);

  log('mapcenter',currentMapCenter);
  async function takePhoto() {
    const { base64String } = await getPhoto();
    const username = localStorage.getItem('username');
    let filepath = `photo-${new Date().getTime()}.jpeg`;
    if (username) {
      filepath = `${username}-photo-${new Date().getTime()}.jpeg`;
    }
    await writeFile(filepath, base64String!);
    const webviewPath = `data:image/jpeg;base64,${base64String}`
    const newPhoto = { filepath, webviewPath };
    setPhoto(newPhoto);
  }
  
  
  useEffect(() => {
    log('useEffect');
    const routeId = match.params.id || '';
    const item = items?.find(it => it._id === routeId);
    setItem(item);
    if (item) {
      setText(item.text);
      if (item.photo) {
        setPhoto(item.photo);
      if (item.coordinates){
        setCoordinates(item.coordinates);
      }
      }
    }
  }, [match.params.id, items]);

  
  const handleSave = async () => { 
    // Use markerCoordinates if available, otherwise fall back to coordinates
    const coordinatesToSave = markerCoordinates || coordinates;
  
    const editedItem = item ? 
      { ...item, text, photo, coordinates: coordinatesToSave } : 
      { text, photo, coordinates: coordinatesToSave };
  
    log('saving item: ', editedItem);
    if (saveItem) {
      await saveItem(editedItem);
      history.goBack();
    }
  };
  
  const handleDelete = async () => {
    if (item && item._id) {
      try {
        // Delete the photo from the filesystem if it exists
        if (item.photo && item.photo.filepath) {
          await deleteFile(item.photo.filepath);
        }
        
        // Proceed to delete the item
        if (deleteItem) {
          await deleteItem(item._id);
          history.goBack();
        }
      } catch (error) {
        console.error("Error deleting item or photo", error);
      }
    }
  };

  const handleMapClick = (e: any) => {
    const newCoordinates = { latitude: e.latitude, longitude: e.longitude };
    log('coordinates', newCoordinates);
    setCoordinates(newCoordinates);
  };
  
  
  log('render');
  return (
<IonPage>
  <IonHeader>
    <IonToolbar>
      <IonTitle>Edit</IonTitle>
      <IonButtons slot="end">
        <IonButton onClick={handleSave}>
          Save
        </IonButton>
        {item && item._id && (
          <IonButton onClick={handleDelete}>
            Delete
          </IonButton>
        )}
      </IonButtons>
    </IonToolbar>
  </IonHeader>
  <IonContent>
    <IonInput value={text} onIonChange={e => setText(e.detail.value || '')} />
    {photo && photo.webviewPath && <IonImg src={photo.webviewPath}/>}
    <IonLoading isOpen={saving} />
    {savingError && (
      <div>{savingError.message || 'Failed to save item'}</div>
    )}
    <IonFab vertical="bottom" horizontal="center" slot="fixed">
    <IonFabButton onClick={takePhoto}>
      <IonIcon icon={camera }></IonIcon>
    </IonFabButton>
  </IonFab>
  <IonFabButton onClick={toggleMap}>
        <IonIcon icon={map}></IonIcon>
      </IonFabButton>
      {showMap && currentMapCenter &&(
        <MyMap 
            mapCenter={currentMapCenter} 
            onMapClick={handleMapClick}
            onMarkerClick={function (e: any): void {
              throw new Error('Function not implemented.');
            } }
      />
      )}
  </IonContent>
</IonPage>

  );
};

export default ItemEdit;
