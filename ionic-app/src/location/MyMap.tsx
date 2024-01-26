import { GoogleMap } from '@capacitor/google-maps';
import { useEffect, useRef, useState } from 'react';
import { mapsApiKey } from './mapsApiKey';
import { Coordinates } from './useMyLocation';

interface MyMapProps {
  mapCenter: Coordinates,
  onMapClick: (e: any) => void,
  onMarkerClick: (e: any) => void,
}

const MyMap: React.FC<MyMapProps> = ({ mapCenter, onMapClick, onMarkerClick }) => {
  const mapRef = useRef<HTMLElement>(null);
  const [googleMap, setGoogleMap] = useState<GoogleMap | null>(null);

  useEffect(myMapEffect, [mapCenter]);


  return (
    <div className="component-wrapper">
      <capacitor-google-map ref={mapRef} style={{
        display: 'block',
        width: '400px', // Consider using '100%' for full width
        height: '400px' // Adjust height as needed
      }}></capacitor-google-map>
    </div>
  );


  function myMapEffect() {
    let canceled = false;
    let googleMap: GoogleMap | null = null;
    createMap();
    return () => {
      canceled = true;
      googleMap?.removeAllMapListeners();
    }

    async function createMap() {
      if (!mapRef.current) {
        return;
      }
      googleMap = await GoogleMap.create({
        id: 'my-cool-map',
        element: mapRef.current,
        apiKey: mapsApiKey,
        config: {
          center: { lat: mapCenter.latitude, lng: mapCenter.longitude },
          zoom: 8
        }
      });
      setGoogleMap(googleMap);
      console.log('Google Map created');
      const initialMarkerId = await googleMap.addMarker({
        coordinate: { lat: mapCenter.latitude, lng: mapCenter.longitude },
        title: 'Initial Location'
      });


      // Set up map click listener
      await googleMap.setOnMapClickListener(({ latitude, longitude }) => {
        onMapClick({ latitude, longitude });
      });

      // Set up marker click listener
      await googleMap.setOnMarkerClickListener(({ markerId, latitude, longitude }) => {
        onMarkerClick({ markerId, latitude, longitude });
      });
    }
  }
  
}

export default MyMap;
