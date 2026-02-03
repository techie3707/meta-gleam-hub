import { useEffect, useState } from "react";
import { FileText, FolderOpen, Users, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { TasksList } from "@/components/dashboard/TasksList";
import { CollectionOverview } from "@/components/dashboard/CollectionOverview";
import { useToast } from "@/hooks/use-toast";
import {
  searchRepository,
  fetchRecentItems,
} from "@/api/discoveryApi";
import {
  getSystemStatus,
  getCurrentUserInfo,
} from "@/api/healthApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalItems: number;
  totalCollections: number;
  activeUsers: number;
  systemStatus: "UP" | "DOWN" | "UNKNOWN";
  contentIssues: number;
}

const Index = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<"UP" | "DOWN" | "UNKNOWN">("UNKNOWN");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all dashboard data in parallel
      const [
        itemsResponse,
        healthStatus,
        userInfo,
      ] = await Promise.all([
        searchRepository({ size: 1 }).catch(() => ({ _embedded: { searchResult: { page: { totalElements: 0 } } } })),
        getSystemStatus().catch(() => ({ overall: "UNKNOWN" as const, components: [] })),
        getCurrentUserInfo().catch(() => null),
      ]);

      const totalItems = itemsResponse._embedded?.searchResult?.page?.totalElements || 0;

      // Try to get collections count
      const collectionsResponse = await searchRepository({ 
        configuration: "collection",
        size: 1 
      }).catch(() => ({ _embedded: { searchResult: { page: { totalElements: 0 } } } }));
      
      const totalCollections = collectionsResponse._embedded?.searchResult?.page?.totalElements || 0;

      setStats({
        totalItems,
        totalCollections,
        activeUsers: userInfo?.authenticated ? 1 : 0,
        systemStatus: healthStatus.overall,
        contentIssues: 0, // Content quality API not available in this DSpace version
      });

      setSystemHealth(healthStatus.overall);

    } catch (error) {
      console.error("Load dashboard data error:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const dashboardStats = stats ? [
    {
      title: "Total Documents",
      value: stats.totalItems.toLocaleString(),
      change: "Repository items",
      changeType: "neutral" as const,
      icon: FileText,
      iconColor: "text-primary",
    },
    {
      title: "Collections",
      value: stats.totalCollections.toString(),
      change: "Active collections",
      changeType: "neutral" as const,
      icon: FolderOpen,
      iconColor: "text-document-word",
    },
    {
      title: "System Health",
      value: stats.systemStatus,
      change: stats.systemStatus === "UP" ? "All systems operational" : "Issues detected",
      changeType: stats.systemStatus === "UP" ? "positive" as const : "negative" as const,
      icon: Activity,
      iconColor: stats.systemStatus === "UP" ? "text-green-600" : "text-red-600",
    },
    {
      title: "Content Issues",
      value: stats.contentIssues.toString(),
      change: "Items needing attention",
      changeType: stats.contentIssues > 0 ? "negative" as const : "positive" as const,
      icon: AlertCircle,
      iconColor: stats.contentIssues > 0 ? "text-yellow-600" : "text-green-600",
    },
  ] : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time overview of your DSpace repository
          </p>
        </div>

        {/* System Health Alert */}
        {systemHealth === "DOWN" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              System health check failed. Some services may be unavailable.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            dashboardStats.map((stat, index) => (
              <div key={stat.title} style={{ animationDelay: `${index * 100}ms` }}>
                <StatCard {...stat} />
              </div>
            ))
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Documents - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentDocuments />
          </div>

          {/* Collections Overview */}
          <div>
            <CollectionOverview />
          </div>
        </div>

        {/* Tasks Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksList />
          
          {/* Quick Actions */}
          <div className="bg-card rounded-xl border border-border p-5 animate-slide-up">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                title="Import Documents"
                description="Upload and categorize new files"
                href="/import"
              />
              <QuickActionCard
                title="Search Repository"
                description="Find documents with advanced filters"
                href="/search"
              />
              <QuickActionCard
                title="Manage Tasks"
                description="View and assign pending tasks"
                href="/tasks"
              />
              <QuickActionCard
                title="Browse Collections"
                description="Explore document categories"
                href="/collections"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

function QuickActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-accent hover:border-primary/30 transition-all duration-200 group"
    >
      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
        {title}
      </h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </a>
  );
}

export default Index;
