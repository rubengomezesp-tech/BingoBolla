import Image from "next/image";
import Link from "next/link";

export default function BrandLogo({ size = 36, href = "/lobby", showText = false }: { size?: number; href?: string; showText?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <Image
        src="/icons/logo-header.png"
        alt="BingoBolla"
        width={Math.round(size * 1.2)}
        height={size}
        priority
        className="object-contain"
        style={{ height: size, width: "auto" }}
      />
    </Link>
  );
}
