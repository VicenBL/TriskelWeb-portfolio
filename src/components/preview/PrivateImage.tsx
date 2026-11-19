"use client";
import React from "react";
import Image, { type ImageProps } from "next/image";
import previewImageLoader from "./image-loader";
// The loader is defined in this client boundary, never passed from a server component.
export default function PrivateImage(props: ImageProps) { return <Image {...props} loader={previewImageLoader} />; }
