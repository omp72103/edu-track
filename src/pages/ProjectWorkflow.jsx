import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, GraduationCap, UserCog, Database, Bell, Calendar,
  FileText, CheckCircle, AlertCircle, BarChart3, MapPin,
  QrCode, Upload, MessageSquare, Megaphone, Clock, Shield,
  Smartphone, Globe, Server, ArrowRight, ArrowDown, Zap,
  BookOpen, TrendingUp, Settings, Mail, Lock, Eye
} from "lucide-react";

export default function ProjectWorkflow() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎓 EDU TRACK - Project Workflow
          </h1>
          <p className="text-gray-600 text-lg">Complete System Architecture & Flow Diagram</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-white/50 p-2 rounded-xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Roles</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
            <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
            <TabsTrigger value="tech">Tech Stack</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl">System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Main Flow Diagram */}
                <div className="relative">
                  {/* Top Level - Users */}
                  <div className="flex justify-center gap-4 md:gap-8 flex-wrap mb-8">
                    <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg min-w-[120px]">
                      <Shield className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-bold">Admin</p>
                      <p className="text-xs opacity-80">Full Access</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl text-white shadow-lg min-w-[120px]">
                      <UserCog className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-bold">Faculty</p>
                      <p className="text-xs opacity-80">Teaching & Attendance</p>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl text-white shadow-lg min-w-[120px]">
                      <GraduationCap className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-bold">Student</p>
                      <p className="text-xs opacity-80">Learning & Tracking</p>
                    </div>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center mb-6">
                    <ArrowDown className="w-8 h-8 text-blue-500 animate-bounce" />
                  </div>

                  {/* Authentication Layer */}
                  <div className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-2xl p-4 mb-6 border-2 border-orange-200">
                    <div className="flex items-center justify-center gap-3">
                      <Lock className="w-6 h-6 text-orange-600" />
                      <span className="font-bold text-orange-800">Google OAuth Authentication</span>
                      <Lock className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-center text-sm text-orange-700 mt-1">Secure login with role-based access control</p>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center mb-6">
                    <ArrowDown className="w-8 h-8 text-blue-500 animate-bounce" />
                  </div>

                  {/* Core Platform */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white mb-6">
                    <h3 className="text-xl font-bold text-center mb-4">🎯 EDU TRACK PLATFORM</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/20 rounded-xl p-3 text-center">
                        <Calendar className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-sm font-semibold">Attendance</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-3 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-sm font-semibold">Assignments</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-3 text-center">
                        <BarChart3 className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-sm font-semibold">Analytics</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-3 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-sm font-semibold">Notifications</p>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Down */}
                  <div className="flex justify-center mb-6">
                    <ArrowDown className="w-8 h-8 text-blue-500 animate-bounce" />
                  </div>

                  {/* Database & Backend */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-4 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Database className="w-6 h-6" />
                        <span className="font-bold">Database (Base44)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Badge className="bg-slate-600">Students</Badge>
                        <Badge className="bg-slate-600">Faculty</Badge>
                        <Badge className="bg-slate-600">Sessions</Badge>
                        <Badge className="bg-slate-600">Attendance</Badge>
                        <Badge className="bg-slate-600">Assignments</Badge>
                        <Badge className="bg-slate-600">Notifications</Badge>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-600 to-teal-700 rounded-2xl p-4 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <Server className="w-6 h-6" />
                        <span className="font-bold">Backend Functions</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <Badge className="bg-green-800">QR Attendance</Badge>
                        <Badge className="bg-green-800">Email Service</Badge>
                        <Badge className="bg-green-800">Push Notifications</Badge>
                        <Badge className="bg-green-800">File Processing</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USER ROLES TAB */}
          <TabsContent value="users" className="mt-6 space-y-6">
            {/* Admin */}
            <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 bg-purple-600 rounded-xl text-white">
                    <Shield className="w-6 h-6" />
                  </div>
                  Admin Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: Users, title: "Manage Faculty", desc: "Add/edit/activate faculty accounts" },
                    { icon: GraduationCap, title: "Manage Students", desc: "Bulk upload, edit student records" },
                    { icon: Database, title: "Manage Batches", desc: "Create classes, divisions, batches" },
                    { icon: AlertCircle, title: "Handle Complaints", desc: "Review and respond to complaints" },
                    { icon: BarChart3, title: "Advanced Analytics", desc: "System-wide reports & insights" },
                    { icon: TrendingUp, title: "Predictive Analysis", desc: "AI-powered attendance predictions" },
                    { icon: Megaphone, title: "Announcements", desc: "Broadcast to all users" },
                    { icon: MapPin, title: "Geo-Fencing", desc: "Configure location boundaries" },
                    { icon: Eye, title: "Proxy Detection", desc: "Monitor suspicious activities" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow">
                      <item.icon className="w-5 h-5 text-purple-600 mt-1" />
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Faculty */}
            <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 rounded-xl text-white">
                    <UserCog className="w-6 h-6" />
                  </div>
                  Faculty Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: Calendar, title: "Create Sessions", desc: "Schedule classes & sessions" },
                    { icon: QrCode, title: "QR Attendance", desc: "Generate QR for attendance" },
                    { icon: CheckCircle, title: "Mark Attendance", desc: "Manual attendance marking" },
                    { icon: FileText, title: "Assignments", desc: "Create & evaluate assignments" },
                    { icon: BookOpen, title: "Teaching Notes", desc: "Upload study materials" },
                    { icon: BarChart3, title: "Performance", desc: "Track student progress" },
                    { icon: Clock, title: "Timetable", desc: "View & manage schedule" },
                    { icon: MessageSquare, title: "Messages", desc: "Communicate with students" },
                    { icon: MapPin, title: "Geo-Fencing", desc: "Set location for sessions" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow">
                      <item.icon className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student */}
            <Card className="border-0 shadow-xl bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 bg-green-600 rounded-xl text-white">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  Student Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: QrCode, title: "Scan QR", desc: "Mark attendance via QR code" },
                    { icon: BarChart3, title: "View Attendance", desc: "Track attendance history" },
                    { icon: FileText, title: "Assignments", desc: "Submit & track assignments" },
                    { icon: BookOpen, title: "Study Notes", desc: "Access teaching materials" },
                    { icon: TrendingUp, title: "Performance", desc: "View grades & progress" },
                    { icon: Clock, title: "Timetable", desc: "Check class schedule" },
                    { icon: Bell, title: "Notifications", desc: "Receive alerts & updates" },
                    { icon: AlertCircle, title: "Complaints", desc: "Raise issues & concerns" },
                    { icon: MessageSquare, title: "Feedback", desc: "Submit course feedback" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow">
                      <item.icon className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODULES TAB */}
          <TabsContent value="modules" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Attendance Module */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-6 h-6" />
                    Attendance Module
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                      <span className="text-sm">Faculty creates session with geo-fence</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                      <span className="text-sm">Dynamic QR code generated (refreshes every 30s)</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">3</div>
                      <span className="text-sm">Student scans QR within geo-fence area</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">4</div>
                      <span className="text-sm">System verifies location + device fingerprint</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                      <span className="text-sm">Attendance marked + notifications sent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Module */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Assignment Module
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">1</div>
                      <span className="text-sm">Faculty creates FILE or QUIZ assignment</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">2</div>
                      <span className="text-sm">Push notification sent to students</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">3</div>
                      <span className="text-sm">Student submits (PDF/Text/Quiz answers)</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">4</div>
                      <span className="text-sm">Faculty evaluates & provides feedback</span>
                    </div>
                    <ArrowDown className="w-4 h-4 mx-auto text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">✓</div>
                      <span className="text-sm">Grades updated in performance analytics</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Module */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Notification Module
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <strong>Real-time Subscriptions:</strong> Entity changes trigger instant notifications
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <strong>Push Notifications:</strong> Works even when PWA is closed
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <strong>In-app Toasts:</strong> Immediate visual alerts
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <strong>Email Notifications:</strong> Important updates via email
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <strong>Triggers:</strong> Complaints, Messages, Announcements, Assignments, Attendance, Proxy Alerts
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Module */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-xl">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Analytics Module
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-green-50 rounded-lg">
                      📊 <strong>Attendance Analytics:</strong> Daily/Weekly/Monthly trends
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                      📈 <strong>Performance Tracking:</strong> Grades, assessments, progress
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                      🔮 <strong>Predictive Analysis:</strong> AI-powered attendance predictions
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg">
                      📋 <strong>Reports:</strong> Consolidated reports, export to PDF
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      ⚠️ <strong>Alerts:</strong> Low attendance warnings, at-risk students
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* DATA FLOW TAB */}
          <TabsContent value="dataflow" className="mt-6">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Entity Relationship & Data Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] p-4">
                    {/* Entities Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                      {/* Core Entities */}
                      <div className="col-span-4 mb-4">
                        <h3 className="text-lg font-bold text-gray-700 mb-3">📦 Core Entities</h3>
                        <div className="grid grid-cols-4 gap-3">
                          {["User", "Student", "Faculty", "Batch", "College"].map(e => (
                            <div key={e} className="p-3 bg-blue-100 rounded-xl text-center border-2 border-blue-300">
                              <Database className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                              <span className="text-sm font-semibold">{e}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attendance Entities */}
                      <div className="col-span-2">
                        <h3 className="text-lg font-bold text-gray-700 mb-3">📅 Attendance</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {["Session", "AttendanceRecord", "AttendanceSession", "GeoFenceZone", "QRActiveStudent", "ProxyDetectionLog"].map(e => (
                            <div key={e} className="p-2 bg-green-100 rounded-lg text-center border border-green-300 text-xs">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Academic Entities */}
                      <div className="col-span-2">
                        <h3 className="text-lg font-bold text-gray-700 mb-3">📚 Academic</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {["Assignment", "AssignmentSubmission", "QuizQuestion", "QuizResponse", "StudentPerformance", "TimeTable"].map(e => (
                            <div key={e} className="p-2 bg-purple-100 rounded-lg text-center border border-purple-300 text-xs">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Communication Entities */}
                      <div className="col-span-2">
                        <h3 className="text-lg font-bold text-gray-700 mb-3">💬 Communication</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {["Message", "Announcement", "StudentNotification", "PushSubscription", "PendingPushNotification"].map(e => (
                            <div key={e} className="p-2 bg-orange-100 rounded-lg text-center border border-orange-300 text-xs">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Feedback Entities */}
                      <div className="col-span-2">
                        <h3 className="text-lg font-bold text-gray-700 mb-3">📝 Feedback</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {["Complaint", "Feedback", "Note", "TeachingNote"].map(e => (
                            <div key={e} className="p-2 bg-red-100 rounded-lg text-center border border-red-300 text-xs">
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Data Flow Arrows */}
                    <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl p-6">
                      <h3 className="text-lg font-bold mb-4">🔄 Data Flow Pipeline</h3>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="text-center">
                          <div className="p-3 bg-blue-500 text-white rounded-xl">
                            <Smartphone className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">User Action</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <div className="p-3 bg-purple-500 text-white rounded-xl">
                            <Globe className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">React Frontend</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <div className="p-3 bg-green-500 text-white rounded-xl">
                            <Server className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">Base44 SDK</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <div className="p-3 bg-slate-700 text-white rounded-xl">
                            <Database className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">Database</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <div className="p-3 bg-orange-500 text-white rounded-xl">
                            <Zap className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">Real-time Sync</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-center">
                          <div className="p-3 bg-red-500 text-white rounded-xl">
                            <Bell className="w-6 h-6 mx-auto" />
                          </div>
                          <p className="text-xs mt-1">Push Notification</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TECH STACK TAB */}
          <TabsContent value="tech" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Frontend */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-t-xl">
                  <CardTitle>🎨 Frontend Stack</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">⚛️</div>
                    <div>
                      <p className="font-semibold">React 18</p>
                      <p className="text-xs text-gray-500">Component-based UI framework</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">🎨</div>
                    <div>
                      <p className="font-semibold">Tailwind CSS</p>
                      <p className="text-xs text-gray-500">Utility-first CSS framework</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">🧩</div>
                    <div>
                      <p className="font-semibold">Shadcn/UI</p>
                      <p className="text-xs text-gray-500">Accessible component library</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">📊</div>
                    <div>
                      <p className="font-semibold">Recharts</p>
                      <p className="text-xs text-gray-500">Data visualization charts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">✨</div>
                    <div>
                      <p className="font-semibold">Framer Motion</p>
                      <p className="text-xs text-gray-500">Smooth animations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Backend */}
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-xl">
                  <CardTitle>⚙️ Backend Stack</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">🔷</div>
                    <div>
                      <p className="font-semibold">Base44 Platform</p>
                      <p className="text-xs text-gray-500">Backend-as-a-Service</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">🦕</div>
                    <div>
                      <p className="font-semibold">Deno Functions</p>
                      <p className="text-xs text-gray-500">Serverless backend functions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">🗄️</div>
                    <div>
                      <p className="font-semibold">Base44 Database</p>
                      <p className="text-xs text-gray-500">NoSQL document storage</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">🔐</div>
                    <div>
                      <p className="font-semibold">Google OAuth</p>
                      <p className="text-xs text-gray-500">Secure authentication</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">🤖</div>
                    <div>
                      <p className="font-semibold">AI/LLM Integration</p>
                      <p className="text-xs text-gray-500">Predictive analysis & insights</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card className="border-0 shadow-xl md:col-span-2">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-xl">
                  <CardTitle>🚀 Key Features & Capabilities</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-2">📱 PWA Support</h4>
                      <ul className="text-xs space-y-1 text-gray-600">
                        <li>• Install on mobile/desktop</li>
                        <li>• Offline capabilities</li>
                        <li>• Push notifications</li>
                        <li>• Native app experience</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                      <h4 className="font-bold text-green-800 mb-2">🔒 Security</h4>
                      <ul className="text-xs space-y-1 text-gray-600">
                        <li>• Google OAuth login</li>
                        <li>• Role-based access control</li>
                        <li>• Device fingerprinting</li>
                        <li>• Geo-fence verification</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                      <h4 className="font-bold text-orange-800 mb-2">⚡ Real-time</h4>
                      <ul className="text-xs space-y-1 text-gray-600">
                        <li>• Live attendance tracking</li>
                        <li>• Instant notifications</li>
                        <li>• Real-time subscriptions</li>
                        <li>• Dynamic QR codes</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-6">
          <p>EDU TRACK - Smart Education Management Platform</p>
          <p className="text-xs mt-1">Built with React, Tailwind CSS, and Base44 Platform</p>
        </div>
      </div>
    </div>
  );
}