import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Calendar,
  User,
  Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchPooledTasks, fetchClaimedTasks } from "@/api/workflowApi";

const statusConfig = {
  pending: { icon: Circle, color: "text-muted-foreground", bgColor: "bg-muted/50" },
  "in-progress": { icon: Clock, color: "text-warning", bgColor: "bg-warning/10" },
  completed: { icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10" },
  overdue: { icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const priorityConfig = {
  low: { color: "bg-muted text-muted-foreground", label: "Low" },
  medium: { color: "bg-warning/10 text-warning", label: "Medium" },
  high: { color: "bg-destructive/10 text-destructive", label: "High" },
};

const filters = ["All", "Pending", "In Progress", "Completed", "Overdue"];

const Tasks = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: pooledTasks, isLoading: isLoadingPooled } = useQuery({
    queryKey: ["pooled-tasks"],
    queryFn: () => fetchPooledTasks()
  });

  const { data: claimedTasks, isLoading: isLoadingClaimed } = useQuery({
    queryKey: ["claimed-tasks"],
    queryFn: () => fetchClaimedTasks()
  });

  const isLoading = isLoadingPooled || isLoadingClaimed;
  const allTasks = [...(pooledTasks || []), ...(claimedTasks || [])];

  const filteredTasks = allTasks.filter((task) => {
    const matchesSearch = searchQuery === "" || 
      task.workflowitem?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const taskCounts = {
    all: allTasks.length,
    pending: pooledTasks?.length || 0,
    inProgress: claimedTasks?.length || 0,
    completed: 0,
    overdue: 0,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage document-related tasks and workflows
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-slide-up">
          <StatBadge label="Total" count={taskCounts.all} color="bg-muted" />
          <StatBadge label="Pending" count={taskCounts.pending} color="bg-muted" />
          <StatBadge label="In Progress" count={taskCounts.inProgress} color="bg-warning/10" />
          <StatBadge label="Completed" count={taskCounts.completed} color="bg-success/10" />
          <StatBadge label="Overdue" count={taskCounts.overdue} color="bg-destructive/10" />
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 animate-slide-up">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter}
                variant={activeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter)}
                className={activeFilter === filter ? "bg-primary" : ""}
              >
                {filter}
              </Button>
            ))}
          </div>
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md bg-card border-border"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">No workflow tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const itemName = task.workflowitem?.name || 'Workflow Task';
              const action = task.action || 'Review';
              
              return (
                <div
                  key={task.id}
                  className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-200 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1">{action}: {itemName}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            Workflow step for {itemName}
                          </p>
                          {task.workflowitem?.id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Item ID: {task.workflowitem.id}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            Pending
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Workflow System</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
};

function StatBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={cn("rounded-lg p-3", color)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground">{count}</p>
    </div>
  );
}

export default Tasks;
