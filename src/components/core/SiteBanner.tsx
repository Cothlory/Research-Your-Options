"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import bannerImage from "../../../assets/banner.jpg";

export function SiteBanner() {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return null;
  }

  return (
    <section aria-label="UVA banner" className="relative w-full overflow-hidden border-b border-slate-200">
      <Image
        src={bannerImage}
        alt="UVA campus banner"
        priority
        className="h-48 w-full object-cover md:h-64"
      />
      <div className="absolute inset-0 bg-[#232D4B]/45" />
    </section>
  );
}