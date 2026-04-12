import { FeatureNav } from "@/components/FeatureNav";

// 기능 페이지(메인 제외)에서 좌측 네비와 본문을 배치하는 래퍼입니다.

type FeaturePageShellProps = {
  children: React.ReactNode;
};

/** 좌측 바로가기 네비게이션과 본문 영역을 나란히 배치합니다. */
export function FeaturePageShell({ children }: FeaturePageShellProps) {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 md:items-start">
      <FeatureNav />
      <div className="flex-1 min-w-0 w-full">{children}</div>
    </div>
  );
}
