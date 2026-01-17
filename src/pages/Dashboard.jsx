import React, { useState, useEffect } from "react";
import { Session, Student, Batch } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Users, Calendar, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [studentCount, setStudentCount] = useState(0);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sessionsData, allStudents, batchesData] = await Promise.all([
        Session.list("-created_date", 20),
        Student.list(),
        Batch.list("-created_date", 10)
      ]);
      
      setSessions(sessionsData);
      setStudentCount(allStudents.length);
      setBatches(batchesData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const todaySessions = sessions.filter(session => 
    format(new Date(session.session_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const completedSessions = sessions.filter(session => session.status === 'completed');
  const avgAttendance = completedSessions.length > 0 
    ? (completedSessions.reduce((sum, session) => {
        const sessionAttendance = (session.total_students && session.total_students > 0) 
          ? ((session.present_count || 0) / session.total_students) 
          : 0;
        return sum + sessionAttendance;
      }, 0) / completedSessions.length * 100)
    : 0;

  const handleBatchClick = (batchId) => {
    navigate(createPageUrl(`BatchDetails?batch_id=${batchId}`));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome to EDU TRACK
            </h1>
            <p className="text-gray-600 text-lg">
              Complete Education Management Platform
            </p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <Link to={createPageUrl("CreateSession")} className="flex-1 md:flex-none">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm">
                <Plus className="w-5 h-5 mr-2" />
                Create Session
              </Button>
            </Link>
            <Link to={createPageUrl("Attendance")} className="flex-1 md:flex-none">
              <Button variant="outline" className="w-full bg-white hover:bg-gray-50">
                <Calendar className="w-5 h-5 mr-2" />
                Take Attendance
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                  <p className="text-xs text-gray-500">Recently created</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{todaySessions.length}</p>
                  <p className="text-xs text-gray-500">Scheduled for today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
                  <p className="text-xs text-gray-500">Across all batches</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                  <p className="text-2xl font-bold text-gray-900">{avgAttendance.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Overall average</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Sessions */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                <Calendar className="w-5 h-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <p>Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No sessions created yet</p>
                  <Link to={createPageUrl("CreateSession")}>
                    <Button className="mt-4">Create Your First Session</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{session.session_name}</h3>
                        <p className="text-sm text-gray-600">{session.batch_description || session.topic_taught}</p>
                        <p className="text-xs text-gray-500">{format(new Date(session.session_date), "MMM d, yyyy")} • {session.session_time}</p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          className={`${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Batches Overview - Fixed Rectangular Cards */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-xl flex items-center gap-2 text-gray-900">
                <Users className="w-5 h-5" />
                Recent Batches Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <p>Loading batches...</p>
              ) : batches.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No batches created yet</p>
                  <Link to={createPageUrl("Upload")}>
                    <Button className="mt-4">Upload Students</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.slice(0, 5).map((batch) => (
                    <div 
                      key={batch.id} 
                      onClick={() => handleBatchClick(batch.id)}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base">{batch.batch_name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{batch.batch_description || `${batch.year} - ${batch.branch}`}</p>
                            <p className="text-xs text-gray-500 mt-1">{batch.college_name}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-purple-600 mb-1">{batch.student_count || 0}</div>
                            <div className="text-xs text-gray-500">Students</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}