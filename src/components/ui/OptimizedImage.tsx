import Image from 'next/image';
import type { StaticImageData } from 'next/image';

interface OptimizedImageProps {
  src: string | StaticImageData;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
        loading={priority ? undefined : 'lazy'}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      loading={priority ? undefined : 'lazy'}
    />
  );
}

