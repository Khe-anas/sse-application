interface BrandLogoProps {
  className?: string;
}

export default function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <img
      src="/branding/cni-logo.jpg"
      alt="Centre National de l'Informatique (CNI)"
      className={`object-contain bg-white ${className}`}
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}
