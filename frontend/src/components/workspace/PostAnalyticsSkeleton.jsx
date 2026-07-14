import { Skeleton } from "../ui/skeleton";

/**
 * Skeleton cho phần header stat-cards của PostAnalyticsDetailPage.
 * Khớp bố cục grid mà mỗi strategy dùng trong renderHeaderStats
 * (grid-cols-2 md:grid-cols-4 gap-4).
 */
export function PostAnalyticsHeaderStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((n) => (
        <Skeleton key={n} className="h-24 rounded-2xl bg-white/10" />
      ))}
    </div>
  );
}

/**
 * Skeleton cho phần nội dung tab (biểu đồ/chart chính) của
 * PostAnalyticsDetailPage. Khớp kích thước các khối chart-container
 * (bg-white p-6 rounded-3xl border) mà mỗi strategy dùng trong renderTabContent.
 */
export function PostAnalyticsTabContentSkeleton() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <Skeleton className="h-4 w-1/3 rounded-lg mb-6" />
      <Skeleton className="h-[260px] w-full rounded-2xl" />
    </div>
  );
}
