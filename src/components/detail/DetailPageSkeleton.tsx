import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";

export const DetailPageSkeleton = () => (
  <div className="min-h-screen bg-[#F8F9FA] pb-24">
    <Header showSearchIcon={false} />
    <div className="max-w-6xl mx-auto md:px-4 md:pt-3">
      <Skeleton className="w-full h-[45vh] md:h-[500px] md:rounded-3xl" />
    </div>
    <main className="container px-4 mt-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr,1fr] gap-4">
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-60 rounded-3xl" />
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-96 rounded-[32px]" />
        </div>
      </div>
    </main>
  </div>
);
