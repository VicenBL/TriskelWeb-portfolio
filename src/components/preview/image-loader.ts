import type { ImageLoaderProps } from "next/image";
// Only the public symbol uses Next's optimizer. Private originals retain cookie checks.
export default function previewImageLoader({ src, width, quality }: ImageLoaderProps): string {
 if (src === "/brand/triskel-simbolo.png") return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
 return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
