import { BookOpen, Megaphone, HardDrive, Settings, Trash2, HelpCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentPlan } from "@/lib/plan-system";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  onOpenBackup: () => void;
  onOpenMarketConfig: () => void;
  onOpenReset: () => void;
  onOpenTour: () => void;
}

export function AppSidebar({ onOpenBackup, onOpenMarketConfig, onOpenReset, onOpenTour }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const userPlan = getCurrentPlan();

  const navItems = [
  {
    title: "Estudio de KW",
    url: "/estudio",
    icon: BookOpen,
    badge: null
  },
  {
    title: "Gestión de ADS",
    url: "/ads",
    icon: Megaphone,
    badge: userPlan === 'starter' ?
    <Badge variant="secondary" className="ml-auto bg-blue-500 text-white text-[9px] px-1 py-0 h-4">
          Plus
        </Badge> :
    null
  }];


  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent>
        {/* App header */}
        {!collapsed && (
          <div className="px-4 py-4 border-b border-border/50">
            <span className="text-sm font-bold tracking-tight text-foreground">KW Research</span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {!collapsed && "Módulos"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                    to={item.url}
                    className="flex items-center gap-2 px-3 py-2 rounded-none text-sm transition-colors hover:bg-muted/50 border-l-2 border-transparent"
                    activeClassName="border-l-2 border-primary text-primary font-medium bg-primary/5">

                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed &&
                    <>
                          <span className="truncate">{item.title}</span>
                          {item.badge}
                        </>
                    }
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className={`flex ${collapsed ? 'flex-col' : 'flex-row flex-wrap'} items-center gap-1`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenTour}>
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="text-xs">Tour guiado</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenMarketConfig}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="text-xs">Criterios por mercado</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenBackup}>
                  <HardDrive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="text-xs">Backup</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ThemeToggle />

          {!collapsed && <div className="w-px h-5 bg-border mx-0.5" />}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onOpenReset}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"><p className="text-xs">Restablecer datos</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarFooter>
    </Sidebar>);

}