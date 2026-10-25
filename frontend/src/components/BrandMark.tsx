import Image from 'next/image';
import logo from '@/Assets/logo.png';
import whiteLogo from '@/Assets/White-logo.png';

interface BrandMarkProps {
  size?: number;
  alt?: string;
  priority?: boolean;
  variant?: 'default' | 'white';
  className?: string;
}

export function BrandMark({
  size = 36,
  alt = '',
  priority = false,
  variant = 'default',
  className = '',
}: BrandMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={variant === 'white' ? whiteLogo : logo}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
