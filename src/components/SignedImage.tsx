import { useEffect, useState } from "react";
import { resolveSignedUrl, type PrivateBucket } from "@/lib/storage/signedUrls";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Stored value: an in-bucket path or a legacy public URL. */
  path: string | null | undefined;
  bucket: PrivateBucket;
  /** Called with the resolved signed URL (e.g. for a lightbox click). */
  onResolved?: (url: string) => void;
}

/**
 * Renders an image stored in a private bucket by resolving it to a short-lived
 * signed URL at display time. Falls back gracefully if signing fails.
 */
export function SignedImage({ path, bucket, onResolved, ...imgProps }: SignedImageProps) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    resolveSignedUrl(path, bucket).then((url) => {
      if (active) {
        setSrc(url);
        if (url && onResolved) onResolved(url);
      }
    });
    return () => {
      active = false;
    };
  }, [path, bucket]);

  if (!src) {
    return <div className={imgProps.className} aria-busy="true" />;
  }
  return <img {...imgProps} src={src} />;
}
