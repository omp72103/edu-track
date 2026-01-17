import React, { useState, useEffect } from "react";
import { Student, StudentPerformance, AttendanceRecord, AttendanceSession, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, TrendingUp, CalendarCheck, User as UserIcon, LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StudentPortal() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EDU TRACK</h1>
                <p className="text-sm text-gray-600">Student Portal</p>
              </div>
            </div>
            <Button onClick={() => User.logout()} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Student Info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">PRN:</span>
                    <span className="ml-2 font-semibold">{student.prn}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Roll No:</span>
                    <span className="ml-2 font-semibold">{student.roll_no}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Year:</span>
                    <span className="ml-2 font-semibold">{student.year}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Branch:</span>
                    <span className="ml-2 font-semibold">{student.branch}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{attendancePercentage}%</div>
              <p className="text-sm text-gray-500 mt-1">
                {attendanceRecords.filter(r => r.is_present).length} / {sessions.length} classes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Average Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{averageGrade}</div>
              <p className="text-sm text-gray-500 mt-1">{performance.length} assessments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {performance.length > 0 ? Math.round(performance.reduce((sum, p) => sum + p.percentage, 0) / performance.length) : 0}%
              </div>
              <p className="text-sm text-gray-500 mt-1">Overall average</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Records */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Academic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {performance.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No performance records available yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{record.subject}</td>
                        <td className="px-4 py-3 text-sm">{record.assessment_type}</td>
                        <td className="px-4 py-3 text-sm">{record.marks_obtained}/{record.total_marks}</td>
                        <td className="px-4 py-3 text-sm">{record.percentage}%</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No attendance records available yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">Total Sessions</span>
                  <span className="font-bold">{sessions.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Present</span>
                  <span className="font-bold text-green-600">{attendanceRecords.filter(r => r.is_present).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium">Absent</span>
                  <span className="font-bold text-red-600">{sessions.length - attendanceRecords.filter(r => r.is_present).length}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}