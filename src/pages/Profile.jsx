import React, { useState, useEffect } from "react";
import { User, Student, Faculty, Session, AttendanceRecord, AssignmentSubmission, Complaint, Feedback } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User as UserIcon, Mail, Calendar, Shield, BookOpen, TrendingUp, Award, LogOut, Edit } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [facultyData, setFacultyData] = useState(null);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Check if student
      const studentRecords = await Student.filter({ email: currentUser.email });
      if (studentRecords.length > 0) {
        setUserRole("student");
        setStudentData(studentRecords[0]);
        await loadStudentStats(studentRecords[0]);
      } else {
        // Check if faculty
        const facultyRecords = await Faculty.filter({ email: currentUser.email });
        if (facultyRecords.length > 0) {
          setUserRole("faculty");
          setFacultyData(facultyRecords[0]);
          await loadFacultyStats(currentUser.email);
        } else {
          setUserRole("admin");
          await loadAdminStats();
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
    setIsLoading(false);
  };

  const loadStudentStats = async (student) => {
    try {
      const [attendance, assignments, sessions] = await Promise.all([
        AttendanceRecord.filter({ student_id: student.id }),
        AssignmentSubmission.filter({ student_id: student.id }),
        Session.filter({ batch_id: student.batch_id })
      ]);

      const presentCount = attendance.filter(a => a.is_present).length;
      const totalSessions = sessions.length;
      const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

      const submittedAssignments = assignments.filter(a => a.status === "Submitted" || a.status === "Evaluated").length;
      const totalAssignments = assignments.length;

      setStats({
        attendancePercent,
        presentCount,
        totalSessions,
        totalAssignments,
        submittedAssignments,
        pendingAssignments: totalAssignments - submittedAssignments
      });
    } catch (error) {
      console.error("Error loading student stats:", error);
    }
  };

  const loadFacultyStats = async (email) => {
    try {
      const sessions = await Session.filter({ faculty_email: email });
      const totalSessions = sessions.length;
      const todaySessions = sessions.filter(s => s.session_date === new Date().toISOString().split('T')[0]).length;

      setStats({
        totalSessions,
        todaySessions,
        activeBatches: [...new Set(sessions.map(s => s.batch_id))].length
      });
    } catch (error) {
      console.error("Error loading faculty stats:", error);
    }
  };

  const loadAdminStats = async () => {
    try {
      const [allSessions, allStudents] = await Promise.all([
        Session.list("-created_date", 100),
        Student.list()
      ]);

      setStats({
        totalStudents: allStudents.length,
        totalSessions: allSessions.length,
        recentSessions: allSessions.slice(0, 5).length
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await User.updateMe(editForm);
      setUser({ ...user, ...editForm });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-4xl font-bold ring-4 ring-white/30 shadow-2xl">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-4xl font-bold mb-2">{user.full_name}</h1>
                  <p className="text-blue-100 text-lg flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </p>
                  <Badge className="mt-2 bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                    <Shield className="w-3 h-3 mr-1" />
                    {userRole === "admin" ? "Administrator" : userRole === "faculty" ? "Faculty" : "Student"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setIsEditing(!isEditing)} variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button onClick={() => User.logout()} variant="outline" className="bg-red-500/20 border-red-300 text-white hover:bg-red-500/30">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Student Overview */}
            {userRole === "student" && studentData && (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.attendancePercent}%</div>
                    <div className="text-blue-100">Attendance</div>
                    <p className="text-xs text-blue-200 mt-2">{stats.presentCount}/{stats.totalSessions} sessions</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.submittedAssignments}</div>
                    <div className="text-green-100">Completed</div>
                    <p className="text-xs text-green-200 mt-2">{stats.totalAssignments} total assignments</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.pendingAssignments}</div>
                    <div className="text-orange-100">Pending</div>
                    <p className="text-xs text-orange-200 mt-2">Assignments due</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Faculty Overview */}
            {userRole === "faculty" && (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.totalSessions}</div>
                    <div className="text-purple-100">Total Sessions</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.todaySessions}</div>
                    <div className="text-blue-100">Today's Classes</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.activeBatches}</div>
                    <div className="text-green-100">Active Batches</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Admin Overview */}
            {userRole === "admin" && (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.totalStudents}</div>
                    <div className="text-indigo-100">Total Students</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">{stats.totalSessions}</div>
                    <div className="text-purple-100">Total Sessions</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 shadow-xl">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-80" />
                    <div className="text-3xl font-bold">Admin</div>
                    <div className="text-pink-100">Full Access</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Profile Info Card */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Full Name</Label>
                    <p className="font-semibold text-lg">{user.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="font-semibold text-lg">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Role</Label>
                    <p className="font-semibold text-lg capitalize">{user.role}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Member Since</Label>
                    <p className="font-semibold text-lg">{new Date(user.created_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {studentData && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-bold text-lg mb-4">Academic Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-600">Roll Number</Label>
                        <p className="font-semibold">{studentData.roll_no}</p>
                      </div>
                      {studentData.prn && (
                        <div>
                          <Label className="text-gray-600">PRN</Label>
                          <p className="font-semibold">{studentData.prn}</p>
                        </div>
                      )}
                      {studentData.college_name && (
                        <div>
                          <Label className="text-gray-600">College</Label>
                          <p className="font-semibold">{studentData.college_name}</p>
                        </div>
                      )}
                      {studentData.year && (
                        <div>
                          <Label className="text-gray-600">Year</Label>
                          <p className="font-semibold">{studentData.year}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
                <CardTitle>Detailed Statistics</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-600">Coming soon - Advanced analytics and performance metrics</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Full Name</Label>
                      <Input 
                        value={editForm.full_name || user.full_name} 
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
                        Save Changes
                      </Button>
                      <Button onClick={() => setIsEditing(false)} variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      Click "Edit Profile" above to update your information
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}