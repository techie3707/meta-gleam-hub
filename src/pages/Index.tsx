import { FileText, FolderOpen, Users, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentDocuments } from "@/components/dashboard/RecentDocuments";
import { TasksList } from "@/components/dashboard/TasksList";
import { CollectionOverview } from "@/components/dashboard/CollectionOverview";

const stats = [
  {
    title: "Total Documents",
    value: "12,847",
    change: "+124 this week",
    changeType: "positive" as const,
    icon: FileText,
    iconColor: "text-primary",
  },
  {
    title: "Collections",
    value: "48",
    change: "+3 this month",
    changeType: "positive" as const,
    icon: FolderOpen,
    iconColor: "text-document-word",
  },
  {
    title: "Active Users",
    value: "156",
    change: "23 online now",
    changeType: "neutral" as const,
    icon: Users,
    iconColor: "text-document-excel",
  },
  {
    title: "Storage Used",
    value: "847 GB",
    change: "78% of quota",
    changeType: "neutral" as const,
    icon: TrendingUp,
    iconColor: "text-document-image",
  },
];

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your document management system.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={stat.title} style={{ animationDelay: `${index * 100}ms` }}>
              <StatCard {...stat} />
            </div>
          ))}
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
