import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fetchWorkflowItems } from "@/api/workflowApi";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress";
  submitter: string;
}

const statusConfig = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  "in-progress": { icon: Clock, color: "text-warning" },
};

export function TasksList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetchWorkflowItems(0, 4);
      
      const tasksData = response.items.map((item) => ({
        id: item.id,
        title: item.item?.name || "Untitled",
        description: `Submitted by ${item.submitter?.email || "Unknown"}`,
        status: "pending" as const,
        submitter: item.submitter?.email || "Unknown",
      }));
      
      setTasks(tasksData);
    } catch (error) {
      console.error("Load tasks error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Workflow Tasks</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length} pending
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : tasks.length > 0 ? (
          tasks.map((task, index) => {
            const StatusIcon = statusConfig[task.status].icon;
            return (
              <div
                key={task.id}
                className="px-5 py-3.5 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => window.location.href = `/workflow`}
              >
                <StatusIcon
                  className={cn("w-5 h-5 flex-shrink-0", statusConfig[task.status].color)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            No pending workflow tasks
          </div>
        )}
      </div>
    </div>
  );
}
