import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  dueDate: string;
  assignee: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Review Q4 Financial Report",
    description: "Check figures and approve for publishing",
    status: "pending",
    priority: "high",
    dueDate: "Today",
    assignee: "John Doe",
  },
  {
    id: "2",
    title: "Categorize new uploads",
    description: "15 documents awaiting categorization",
    status: "in-progress",
    priority: "medium",
    dueDate: "Tomorrow",
    assignee: "Jane Smith",
  },
  {
    id: "3",
    title: "Update metadata for Legal docs",
    description: "Add missing author and date fields",
    status: "overdue",
    priority: "high",
    dueDate: "Yesterday",
    assignee: "Mike Johnson",
  },
  {
    id: "4",
    title: "Archive 2023 project files",
    description: "Move completed project docs to archive",
    status: "pending",
    priority: "low",
    dueDate: "Next week",
    assignee: "Sarah Wilson",
  },
];

const statusConfig = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  "in-progress": { icon: Clock, color: "text-warning" },
  completed: { icon: CheckCircle2, color: "text-success" },
  overdue: { icon: AlertCircle, color: "text-destructive" },
};

const priorityConfig = {
  low: { color: "bg-muted text-muted-foreground" },
  medium: { color: "bg-warning/10 text-warning" },
  high: { color: "bg-destructive/10 text-destructive" },
};

export function TasksList() {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden animate-slide-up">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Active Tasks</h3>
        <Badge variant="secondary" className="text-xs">
          {mockTasks.filter((t) => t.status !== "completed").length} pending
        </Badge>
      </div>
      <div className="divide-y divide-border">
        {mockTasks.map((task, index) => {
          const StatusIcon = statusConfig[task.status].icon;
          return (
            <div
              key={task.id}
              className="task-item mx-3 my-2 border-0"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <StatusIcon
                className={cn("w-5 h-5 flex-shrink-0", statusConfig[task.status].color)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{task.title}</p>
                  <Badge className={cn("text-xs", priorityConfig[task.priority].color)}>
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
              </div>
              <div className="text-right text-xs">
                <p
                  className={cn(
                    task.status === "overdue" ? "text-destructive font-medium" : "text-muted-foreground"
                  )}
                >
                  {task.dueDate}
                </p>
                <p className="text-muted-foreground">{task.assignee}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
