import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Upload,
  FolderOpen,
  CheckSquare,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  Library,
  Receipt,
  Users,
  GitBranch,
  LogOut,
  ChevronDown,
  Activity,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarContext } from "./AppLayout";
import { siteConfig } from "@/config/siteConfig";
import { fetchCollections, groupCollectionsByCategory, Collection } from "@/api/collectionApi";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Search,
  Upload,
  FolderOpen,
  FileText,
  CheckSquare,
  Receipt,
  Users,
  GitBranch,
  Settings,
  Activity,
  Database,
};

export function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebarContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<Map<string, Collection[]>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const location = useLocation();
  const { isAdmin, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadCollections();
    }
  }, [isAuthenticated]);

  const loadCollections = async () => {
    try {
      const result = await fetchCollections(0, 100);
      setCollections(result.collections);
      setCategoryGroups(groupCollectionsByCategory(result.collections));
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleLogout = async () => {
    await logout();
  };

  const mainNavigation = siteConfig.navigation.main.map((item) => ({
    ...item,
    Icon: iconMap[item.icon] || FileText,
  }));

  const adminNavigation = siteConfig.navigation.admin.map((item) => ({
    ...item,
    Icon: iconMap[item.icon] || FileText,
  }));

  const bottomNavigation = siteConfig.navigation.bottom.map((item) => ({
    ...item,
    Icon: iconMap[item.icon] || Settings,
  }));

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Library className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">{siteConfig.name}</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Library className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main Navigation */}
        {mainNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <item.Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}

        {/* Collections Section */}
        {!collapsed && categoryGroups.size > 0 && (
          <div className="pt-4">
            <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Collections
            </div>
            {Array.from(categoryGroups.entries()).map(([category, cols]) => (
              <Collapsible
                key={category}
                open={expandedCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="sidebar-item w-full justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 flex-shrink-0" />
                    <span>{category}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expandedCategories.includes(category) && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1">
                  {cols.map((col) => (
                    <NavLink
                      key={col.id}
                      to={`/search?scope=${col.id}`}
                      className={cn(
                        "sidebar-item text-sm py-2",
                        location.search.includes(col.id) && "sidebar-item-active"
                      )}
                    >
                      <span className="truncate">{col.name.split("_").slice(1).join(" ") || col.name}</span>
                    </NavLink>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Admin Section */}
        {isAdmin && !collapsed && (
          <div className="pt-4">
            <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
              Admin
            </div>
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "sidebar-item",
                    isActive && "sidebar-item-active"
                  )}
                >
                  <item.Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-sidebar-primary")} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1 flex-shrink-0">
        {bottomNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <item.Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          );
        })}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-destructive/80 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-2"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
