import { Camera, CameraResultType, CameraSource, Photo } from "@capacitor/camera";
import { useCallback } from "react";

export function useCamera() {
  const getPhoto = useCallback<() => Promise<Photo>>(
    () => Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      quality: 100,
    }), []);

  return {
    getPhoto,
  };
}