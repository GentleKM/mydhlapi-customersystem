"use client";

// 메인이 아닌 기능 화면 좌측에 표시되는 주요 메뉴 바로가기입니다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, FileText, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "메인", icon: Home },
  { href: "/quote", label: "견적 조회", icon: Search },
  { href: "/shipments/create", label: "운송장 생성", icon: FileText },
  { href: "/shipments", label: "운송장 조회", icon: Package },
  { href: "/pickup", label: "픽업 요청", icon: Truck },
] as const;

/** 현재 경로에 따라 활성 링크를 강조하는 좌측 세로 네비게이션입니다. */
export function FeatureNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    if (href === "/quote") return pathname === "/quote";
    if (href === "/shipments/create") {
      return (
        pathname === "/shipments/create" ||
        pathname.startsWith("/shipments/create/")
      );
    }
    if (href === "/shipments") {
      if (!pathname.startsWith("/shipments")) return false;
      if (pathname.startsWith("/shipments/create")) return false;
      return true;
    }
    if (href === "/pickup") return pathname === "/pickup";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="주요 메뉴"
      className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-border md:pr-4"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0 opacity-90" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
