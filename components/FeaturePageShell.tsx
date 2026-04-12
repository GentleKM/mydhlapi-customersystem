import { FeatureNav } from "@/components/FeatureNav";

// 메인·기능 페이지 공통: 좌측 네비 + 본문. 네비는 스크롤 시에도 보이도록 sticky 처리합니다.

type FeaturePageShellProps = {
  children: React.ReactNode;
};

/** 좌측 바로가기 네비게이션과 본문을 배치하고, 네비를 뷰포트에 고정(sticky)합니다. */
export function FeaturePageShell({ children }: FeaturePageShellProps) {
  return (
    <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row gap-6 md:gap-8 md:items-start">
      <div
        className="sticky top-0 z-30 -mx-4 shrink-0 bg-background/95 px-4 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:top-8 md:-mx-0 md:w-48 md:self-start md:rounded-2xl md:border md:border-border/60 md:bg-card/95 md:p-3 md:shadow-sm md:backdrop-blur-sm"
      >
        <FeatureNav />
      </div>
      <div className="flex-1 min-w-0 w-full min-h-0">{children}</div>
    </div>
  );
}
