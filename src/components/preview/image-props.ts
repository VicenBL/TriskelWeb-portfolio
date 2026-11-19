import { getImageProps as nextImageProps, type ImageProps } from "next/image";
import previewImageLoader from "./image-loader";
export function getImageProps(props: ImageProps) { return nextImageProps({ ...props, loader: previewImageLoader }); }
