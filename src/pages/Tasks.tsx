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
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high";
  dueDate: string;
  assignee: string;
  documentRef?: string;
  category: string;
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Review Q4 Financial Report",
    description: "Check figures and approve for publishing to stakeholders",
    status: "pending",
    priority: "high",
    dueDate: "Today, 5:00 PM",
    assignee: "John Doe",
    documentRef: "Annual Report 2024.pdf",
    category: "Review",
  },
  {
    id: "2",
    title: "Categorize new document uploads",
    description: "15 documents awaiting proper categorization and metadata",
    status: "in-progress",
    priority: "medium",
    dueDate: "Tomorrow, 12:00 PM",
    assignee: "Jane Smith",
    category: "Organization",
  },
  {
    id: "3",
    title: "Update Legal contract metadata",
    description: "Add missing author and expiration date fields",
    status: "overdue",
    priority: "high",
    dueDate: "Yesterday",
    assignee: "Mike Johnson",
    documentRef: "Service Agreement v2.pdf",
    category: "Metadata",
  },
  {
    id: "4",
    title: "Archive 2023 project files",
    description: "Move completed project documentation to archive collection",
    status: "pending",
    priority: "low",
    dueDate: "Dec 20, 2024",
    assignee: "Sarah Wilson",
    category: "Archival",
  },
  {
    id: "5",
    title: "Approve HR policy updates",
    description: "Review and approve updated employee handbook sections",
    status: "pending",
    priority: "medium",
    dueDate: "Dec 18, 2024",
    assignee: "Emily Chen",
    documentRef: "Employee Handbook 2024.pdf",
    category: "Approval",
  },
  {
    id: "6",
    title: "Verify technical documentation",
    description: "Cross-check API documentation with latest implementation",
    status: "completed",
    priority: "medium",
    dueDate: "Dec 10, 2024",
    assignee: "Dev Team",
    documentRef: "API Docs v2.0",
    category: "Review",
  },
];

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

  const filteredTasks = mockTasks.filter((task) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "In Progress" && task.status === "in-progress") ||
      task.status === activeFilter.toLowerCase();
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const taskCounts = {
    all: mockTasks.length,
    pending: mockTasks.filter((t) => t.status === "pending").length,
    inProgress: mockTasks.filter((t) => t.status === "in-progress").length,
    completed: mockTasks.filter((t) => t.status === "completed").length,
    overdue: mockTasks.filter((t) => t.status === "overdue").length,
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
          {filteredTasks.map((task, index) => {
            const StatusIcon = statusConfig[task.status].icon;
            return (
              <div
                key={task.id}
                className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.status === "completed"}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={cn(
                              "font-semibold",
                              task.status === "completed"
                                ? "text-muted-foreground line-through"
                                : "text-foreground"
                            )}
                          >
                            {task.title}
                          </h3>
                          <Badge className={priorityConfig[task.priority].color}>
                            {priorityConfig[task.priority].label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                        {task.documentRef && (
                          <p className="text-xs text-primary mt-2 hover:underline cursor-pointer">
                            📎 {task.documentRef}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "px-2.5 py-1 rounded-full flex items-center gap-1.5",
                          statusConfig[task.status].bgColor
                        )}
                      >
                        <StatusIcon
                          className={cn("w-4 h-4", statusConfig[task.status].color)}
                        />
                        <span
                          className={cn(
                            "text-xs font-medium capitalize",
                            statusConfig[task.status].color
                          )}
                        >
                          {task.status.replace("-", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span
                          className={cn(
                            task.status === "overdue" && "text-destructive font-medium"
                          )}
                        >
                          {task.dueDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span>{task.assignee}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
