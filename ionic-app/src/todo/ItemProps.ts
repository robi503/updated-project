import { Coordinates } from "../location/useMyLocation";
import { MyPhoto } from "./ItemEdit";


export interface ItemProps {
  _id?: string;
  text: string;
  photo?: MyPhoto;
  coordinates?: Coordinates | null;
}
