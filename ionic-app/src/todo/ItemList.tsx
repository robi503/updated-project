import React, { useContext, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar
} from '@ionic/react';
import { add } from 'ionicons/icons';
import Item from './Item';
import { getLogger } from '../core';
import { ItemContext } from './ItemProvider';
import { AuthContext } from '../auth';
import { useNetwork } from '../net/useNetwork';

const log = getLogger('ItemList');

const ItemList: React.FC<RouteComponentProps> = ({ history }) => {
  const { items, fetching, fetchingError } = useContext(ItemContext);
  const { logout } = useContext(AuthContext);
  const { networkStatus } = useNetwork();
  const [searchTerm, setSearchTerm] = useState('');

  log('render', fetching);

  useEffect(() => {
  }, [networkStatus.connected]);

  const filteredItems = items?.filter(item =>
    item.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Item List</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar 
            value={searchTerm}
            onIonInput={e => setSearchTerm(e.detail.value || '')}
            animated={true}
            placeholder="Search"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching items" />
        {filteredItems && (
          <IonList>
            {filteredItems.map(({ _id, text }) =>
              <Item key={_id} _id={_id} text={text} onEdit={id => history.push(`/item/${id}`)} />
            )}
          </IonList>
        )}
        {fetchingError && (
          <div>{fetchingError.message || 'Failed to fetch items'}</div>
        )}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push('/item')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
        <IonButton onClick={logout}>Logout</IonButton>
        {!networkStatus.connected && <div>No network connection</div>}
      </IonContent>
    </IonPage>
  );
};

export default ItemList;
