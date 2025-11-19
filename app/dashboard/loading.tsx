import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <main className="flex-1 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-muted rounded w-72 animate-pulse"></div>
              <div className="h-10 bg-muted rounded w-16 animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
                <div className="h-5 bg-muted rounded w-8 animate-pulse"></div>
              </div>
              <div className="h-4 bg-muted rounded w-48 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Card key={`owned-doc-${i}`} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted rounded w-36 animate-pulse"></div>
                <div className="h-5 bg-muted rounded w-8 animate-pulse"></div>
              </div>
              <div className="h-4 bg-muted rounded w-52 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 2 }, (_, i) => (
                <Card key={`shared-doc-${i}`} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
