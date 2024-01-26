import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const useMyLocation = () => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMyLocation = async () => {
      try {
        const position = await Geolocation.getCurrentPosition();
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      } catch (error) {
        if (error instanceof Error) {
          setError(error);
        } else {
          console.error("An unexpected error occurred:", error);
          setError(new Error("An unexpected error occurred"));
        }
      }
    };

    fetchMyLocation();
  }, []);

  return { coordinates, error };
};
