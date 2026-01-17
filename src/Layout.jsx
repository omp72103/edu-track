import React, { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { User, Faculty } from "@/entities/all";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Upload,
  CalendarCheck,
  Users,
  Building,
  UserCog,
  FileText,
  Book,
  LogOut,
  Menu,
  GraduationCap,
  AlertCircle,
  TrendingUp,
  Calendar,
  MessageSquare,
  Megaphone,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const mainNavItems = [
  { name: "Home", icon: LayoutDashboard },
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "CreateSession", label: "Create Session", icon: PlusCircle },
  { name: "Upload", label: "Upload Students", icon: Upload },
  { name: "Attendance", label: "Take Attendance", icon: CalendarCheck },
  { name: "Batches", label: "Manage Batches", icon: Users },
  { name: "TimeTable", label: "Timetable", icon: Calendar },
  { name: "Performance", label: "Performance", icon: TrendingUp },
  { name: "Announcements", label: "Announcements", icon: Megaphone },
  { name: "Messages", label: "Messages", icon: MessageSquare },
  { name: "AITimetableGenerator", label: "AI Timetable", icon: Sparkles },
];

const adminNavItems = [
  { name: "ManageColleges", label: "Manage Colleges", icon: Building },
  { name: "ManageFaculty", label: "Manage Faculty", icon: UserCog },
  { name: "FacultyReport", label: "Faculty Report", icon: FileText },
  { name: "ConsolidatedReport", label: "Consolidated Report", icon: Book },
  { name: "AdvancedAnalysis", label: "Advanced Analysis", icon: TrendingUp },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      // Public pages - no auth needed
      if (currentPageName === "QRAttendanceStudent" || currentPageName === "Home") {
        setUserLoading(false);
        return;
      }

      // Student portal - separate auth flow
      if (currentPageName === "StudentPortal") {
        setUserLoading(false);
        return;
      }

      setUserLoading(true);
      setAuthError(null);
      
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        console.log("✅ User logged in:", currentUser.email, "Role:", currentUser.role);
        
        // AUTO-FIX: If user is not admin and not in Faculty table, add them automatically
        if (currentUser.role !== 'admin') {
          try {
            const facultyRecords = await Faculty.filter({ email: currentUser.email });
            
            if (facultyRecords.length === 0) {
              // User is not in Faculty table - add them automatically!
              console.log("🔧 Adding user to Faculty table automatically...");
              
              await Faculty.create({
                name: currentUser.full_name || currentUser.email.split('@')[0],
                email: currentUser.email,
                department: "General",
                status: "active"
              });
              
              console.log("✅ User added to Faculty table successfully");
            } else {
              console.log("✅ User already exists in Faculty table");
            }
          } catch (facultyError) {
            console.error("❌ Error checking/creating faculty record:", facultyError);
            // Don't block access even if this fails
          }
        }
        
      } catch (error) {
        console.error("❌ User not logged in:", error);
        setUser(null);
      }
      
      setUserLoading(false);
    };
    
    fetchUser();
  }, [currentPageName]);

  // Public pages - render without layout
  if (currentPageName === "QRAttendanceStudent" || currentPageName === "StudentPortal" || currentPageName === "Home") {
    return <>{children}</>;
  }

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="bg-blue-600 p-3 rounded-lg inline-block mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EDU TRACK</h1>
            <p className="text-gray-600">Education Management Platform</p>
          </div>
          <p className="text-gray-700 mb-6">Please log in to access the faculty dashboard.</p>
          <button 
            onClick={() => User.login()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  // User is logged in - show full app (authorization happens automatically)
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b relative">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-gray-800">EDU TRACK</span>
                  <span className="text-xs text-gray-500">Education Management</span>
                </div>
              )}
            </div>
            {/* Collapse Button - Desktop Only */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
            <div>
              {!isSidebarCollapsed && <span className="text-xs font-semibold text-gray-500 px-3">MAIN MENU</span>}
              <div className="mt-2 space-y-1">
                {mainNavItems.map((item) => {
                  const isActive = location.pathname.startsWith(createPageUrl(item.name));
                  return (
                    <Link
                      key={item.name}
                      to={createPageUrl(item.name)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      onClick={() => setIsSidebarOpen(false)}
                      title={isSidebarCollapsed ? (item.label || item.name) : ''}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!isSidebarCollapsed && <span>{item.label || item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
            
            {user && user.role === 'admin' && (
              <div>
                {!isSidebarCollapsed && <span className="text-xs font-semibold text-gray-500 px-3">ADMIN</span>}
                <div className="mt-2 space-y-1">
                  {adminNavItems.map((item) => {
                    const isActive = location.pathname.startsWith(createPageUrl(item.name));
                    return (
                      <Link
                        key={item.name}
                        to={createPageUrl(item.name)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                        title={isSidebarCollapsed ? (item.label || item.name) : ''}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!isSidebarCollapsed && <span>{item.label || item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Section */}
          <div className="p-4 border-t">
            {user && !isSidebarCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
            {user && isSidebarCollapsed && (
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" title={user.full_name}>
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <button
              onClick={() => User.logout()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full ${isSidebarCollapsed ? 'justify-center' : ''}`}
              title={isSidebarCollapsed ? 'Logout' : ''}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm p-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="font-bold text-lg">EDU TRACK</div>
          <div className="w-10"></div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}