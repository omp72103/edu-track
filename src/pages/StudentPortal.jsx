import React, { useState, useEffect } from "react";
import { Student, StudentPerformance, AttendanceRecord, AttendanceSession, User, Announcement, TimeTable, Session } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, TrendingUp, CalendarCheck, User as UserIcon, LogOut, Bell, Megaphone, BookOpen, Award, Menu, X, Home, BarChart3, Calendar, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentPortal() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      // Find student record by email
      const studentRecords = await Student.filter({ email: currentUser.email });
      
      if (studentRecords.length === 0) {
        setError("No student record found for your email. Please contact administration.");
        setLoading(false);
        return;
      }

      const studentData = studentRecords[0];
      setStudent(studentData);

      // Load performance records
      const performanceData = await StudentPerformance.filter({ 
        prn: studentData.prn 
      });
      setPerformance(performanceData.sort((a, b) => 
        new Date(b.assessment_date) - new Date(a.assessment_date)
      ));

      // Load attendance records
      const attendanceData = await AttendanceRecord.filter({ 
        student_id: studentData.id 
      });
      setAttendanceRecords(attendanceData);

      // Load sessions for attendance
      const sessionData = await AttendanceSession.filter({ 
        batch_id: studentData.batch_id 
      });
      setSessions(sessionData);

      // Load announcements
      const announcementsData = await Announcement.list('-announcement_date', 10);
      const relevantAnnouncements = announcementsData.filter(a => 
        a.recipient_type === "All" || 
        a.recipient_type === "Students" || 
        (a.recipient_type === "Batch" && a.batch_id === studentData.batch_id)
      );
      setAnnouncements(relevantAnnouncements);

      // Load timetable
      const timetableData = await TimeTable.filter({ batch_id: studentData.batch_id });
      setTimetable(timetableData);

      // Load upcoming sessions
      const sessionsData = await Session.filter({ batch_id: studentData.batch_id });
      const today = new Date();
      const upcoming = sessionsData.filter(s => new Date(s.session_date) >= today).sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
      setUpcomingSessions(upcoming.slice(0, 5));

    } catch (err) {
      console.error("Error loading student data:", err);
      setError("Failed to load student data. Please try again.");
    }
    setLoading(false);
  };

  const calculateAttendancePercentage = () => {
    if (sessions.length === 0) return 0;
    const presentCount = attendanceRecords.filter(r => r.is_present).length;
    return Math.round((presentCount / sessions.length) * 100);
  };

  const calculateAverageGrade = () => {
    if (performance.length === 0) return "N/A";
    const totalPercentage = performance.reduce((sum, p) => sum + p.percentage, 0);
    const avgPercentage = totalPercentage / performance.length;
    
    if (avgPercentage >= 90) return "A+";
    if (avgPercentage >= 80) return "A";
    if (avgPercentage >= 70) return "B+";
    if (avgPercentage >= 60) return "B";
    if (avgPercentage >= 50) return "C";
    return "D";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="bg-blue-600 p-3 rounded-lg inline-block mb-4">
              <GraduationCap className="w-8 h-8 text-white mx-auto" />
            </div>
            <CardTitle>Student Portal - EDU TRACK</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 mb-6">Please log in to view your academic records</p>
            <Button onClick={() => User.login()} className="w-full bg-blue-600">
              Login with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => User.logout()} 
              className="w-full mt-4"
              variant="outline"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendancePercentage = calculateAttendancePercentage();
  const averageGrade = calculateAverageGrade();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "performance", label: "Performance", icon: BarChart3 },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "profile", label: "Profile", icon: UserIcon },
  ];

  const calculateSubjectWiseAttendance = () => {
    const subjectMap = {};
    
    sessions.forEach(session => {
      const subject = session.session_name || "General";
      if (!subjectMap[subject]) {
        subjectMap[subject] = { total: 0, present: 0 };
      }
      subjectMap[subject].total++;
      
      const attendance = attendanceRecords.find(r => r.session_id === session.id);
      if (attendance && attendance.is_present) {
        subjectMap[subject].present++;
      }
    });

    return Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      total: data.total,
      present: data.present,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
    }));
  };

  const renderContent = () => {
    switch(activeTab) {
      case "dashboard":
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-3 gap-6">
              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 backdrop-blur-lg bg-opacity-80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-600">{attendancePercentage}%</div>
                    <p className="text-sm text-blue-600 mt-1">
                      {attendanceRecords.filter(r => r.is_present).length} / {sessions.length} classes
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 backdrop-blur-lg bg-opacity-80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Average Grade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-600">{averageGrade}</div>
                    <p className="text-sm text-green-600 mt-1">{performance.length} assessments</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 backdrop-blur-lg bg-opacity-80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Overall Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-purple-600">
                      {performance.length > 0 ? Math.round(performance.reduce((sum, p) => sum + p.percentage, 0) / performance.length) : 0}%
                    </div>
                    <p className="text-sm text-purple-600 mt-1">Average performance</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Announcements */}
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  Recent Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No announcements at the moment</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.slice(0, 3).map((announcement) => (
                      <motion.div 
                        key={announcement.id} 
                        whileHover={{ x: 4 }}
                        className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                          <Badge className={
                            announcement.priority === "Urgent" ? "bg-red-100 text-red-700" :
                            announcement.priority === "High" ? "bg-orange-100 text-orange-700" :
                            "bg-blue-100 text-blue-700"
                          }>
                            {announcement.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{announcement.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(announcement.announcement_date).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Classes */}
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Upcoming Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No upcoming sessions scheduled</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <motion.div
                        key={session.id}
                        whileHover={{ x: 4 }}
                        className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">{session.topic_taught}</h4>
                            <p className="text-sm text-gray-600 mt-1">{session.faculty_name}</p>
                          </div>
                          <Badge className="bg-indigo-100 text-indigo-700">
                            {new Date(session.session_date).toLocaleDateString()}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{session.session_time} • {session.duration}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Summary */}
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle>Attendance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No attendance records available yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <div className="text-sm font-medium text-gray-600 mb-1">Total Sessions</div>
                      <div className="text-3xl font-bold text-gray-900">{sessions.length}</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                      <div className="text-sm font-medium text-green-700 mb-1">Present</div>
                      <div className="text-3xl font-bold text-green-600">{attendanceRecords.filter(r => r.is_present).length}</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                      <div className="text-sm font-medium text-red-700 mb-1">Absent</div>
                      <div className="text-3xl font-bold text-red-600">{sessions.length - attendanceRecords.filter(r => r.is_present).length}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case "attendance":
        const subjectWiseAttendance = calculateSubjectWiseAttendance();
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-600" />
                  Overall Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg className="transform -rotate-90 w-40 h-40">
                      <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                      <circle 
                        cx="80" 
                        cy="80" 
                        r="70" 
                        stroke="url(#gradient)" 
                        strokeWidth="12" 
                        fill="none"
                        strokeDasharray={`${(attendancePercentage / 100) * 440} 440`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {attendancePercentage}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{sessions.length}</div>
                    <div className="text-sm text-gray-500">Total Classes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{attendanceRecords.filter(r => r.is_present).length}</div>
                    <div className="text-sm text-gray-500">Present</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{sessions.length - attendanceRecords.filter(r => r.is_present).length}</div>
                    <div className="text-sm text-gray-500">Absent</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Subject-wise Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subjectWiseAttendance.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No subject data available</p>
                ) : (
                  <div className="space-y-4">
                    {subjectWiseAttendance.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-semibold text-gray-900">{item.subject}</h4>
                          <Badge className={
                            item.percentage >= 75 ? "bg-green-100 text-green-700" :
                            item.percentage >= 60 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {item.percentage}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                            />
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            {item.present}/{item.total}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case "performance":
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Academic Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performance.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No performance records available yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Subject</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Assessment</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Marks</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Percentage</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Grade</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {performance.map((record) => (
                          <motion.tr 
                            key={record.id} 
                            whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                            className="transition-colors"
                          >
                            <td className="px-4 py-3 text-sm font-medium">{record.subject}</td>
                            <td className="px-4 py-3 text-sm">{record.assessment_type}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{record.marks_obtained}/{record.total_marks}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                                    style={{ width: `${record.percentage}%` }}
                                  />
                                </div>
                                <span className="font-semibold">{record.percentage}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className={
                                record.grade === "A+" || record.grade === "A" ? "bg-green-100 text-green-800" :
                                record.grade === "B+" || record.grade === "B" ? "bg-blue-100 text-blue-800" :
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {record.grade}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{record.assessment_date}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case "announcements":
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  All Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {announcements.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No announcements available</p>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <motion.div 
                        key={announcement.id}
                        whileHover={{ scale: 1.01 }}
                        className="p-5 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{announcement.title}</h3>
                            <p className="text-xs text-gray-600 mt-1">
                              From: {announcement.sender_name} • {new Date(announcement.announcement_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={
                              announcement.priority === "Urgent" ? "bg-red-100 text-red-700" :
                              announcement.priority === "High" ? "bg-orange-100 text-orange-700" :
                              announcement.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            }>
                              {announcement.priority}
                            </Badge>
                            <Badge variant="outline">{announcement.category}</Badge>
                          </div>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{announcement.message}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case "timetable":
        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const groupedTimetable = daysOrder.reduce((acc, day) => {
          acc[day] = timetable.filter(t => t.day_of_week === day).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
          return acc;
        }, {});

        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Weekly Timetable
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timetable.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No timetable available</p>
                ) : (
                  <div className="space-y-6">
                    {daysOrder.map((day) => (
                      groupedTimetable[day] && groupedTimetable[day].length > 0 && (
                        <div key={day}>
                          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" />
                            {day}
                          </h3>
                          <div className="grid gap-3 md:grid-cols-2">
                            {groupedTimetable[day].map((slot, index) => (
                              <motion.div
                                key={index}
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900">{slot.subject}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{slot.faculty_name}</p>
                                  </div>
                                  <Badge className="bg-indigo-100 text-indigo-700">
                                    {slot.class_type || "Lecture"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mt-3">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {slot.time_slot}
                                  </div>
                                  {slot.room_number && (
                                    <div className="flex items-center gap-1">
                                      <BookOpen className="w-4 h-4" />
                                      Room {slot.room_number}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );

      case "profile":
        return (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="backdrop-blur-md bg-white/90 border-gray-200 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  My Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-white">{student.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-1">{student.name}</h2>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">PRN Number</div>
                        <div className="text-lg font-bold text-gray-900">{student.prn || "N/A"}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Roll Number</div>
                        <div className="text-lg font-bold text-gray-900">{student.roll_no}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Year</div>
                        <div className="text-lg font-bold text-gray-900">{student.year}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Branch</div>
                        <div className="text-lg font-bold text-gray-900">{student.branch}</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg col-span-2">
                        <div className="text-xs text-gray-600 mb-1">College</div>
                        <div className="text-lg font-bold text-gray-900">{student.college_name}</div>
                      </div>
                      {student.division && (
                        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg col-span-2">
                          <div className="text-xs text-gray-600 mb-1">Division</div>
                          <div className="text-lg font-bold text-gray-900">{student.division}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-xl shadow-2xl z-50 lg:hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">EDU TRACK</h2>
                      <p className="text-xs text-gray-500">Student Portal</p>
                    </div>
                  </div>
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden">
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                        activeTab === item.id
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </motion.button>
                  ))}
                </nav>

                <div className="mt-8 pt-6 border-t">
                  <Button
                    onClick={() => User.logout()}
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white/95 backdrop-blur-xl shadow-2xl z-30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">EDU TRACK</h2>
              <p className="text-xs text-gray-500">Student Portal</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ x: 4 }}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </motion.button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t">
            <Button
              onClick={() => User.logout()}
              variant="outline"
              className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl shadow-md sticky top-0 z-20 border-b border-gray-200">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Welcome back, {student?.name?.split(' ')[0]}!
                  </h1>
                  <p className="text-sm text-gray-600">Have a great learning day</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <button className="relative p-2 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 hover:from-blue-100 hover:to-indigo-200">
                    <Bell className="w-5 h-5 text-blue-600" />
                    {announcements.length > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                </motion.div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    {student?.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900 text-sm">{student?.roll_no}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {renderContent()}
        </main>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}