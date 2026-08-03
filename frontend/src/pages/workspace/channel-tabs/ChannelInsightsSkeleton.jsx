function Block({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className}`} />;
}

/**
 * Mirrors ChannelInsightsTab's real layout (sub-nav bar + chart cards) so the
 * page doesn't jump when data arrives, instead of a spinner floating in an
 * otherwise empty viewport.
 */
export function ChannelInsightsSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-background">
      <div
        className="sticky top-0 z-20 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 border-b border-border"
        style={{ height: 48 }}
      >
        <div className="flex gap-8 h-full items-center">
          <Block className="h-3 w-20" />
          <Block className="h-3 w-24" />
          <Block className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Block className="h-8 w-32 rounded-lg" />
          <Block className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6 pb-12 w-full">
        <Block className="h-64 w-full" />
        <Block className="h-64 w-full" />
      </div>
    </div>
  );
}
