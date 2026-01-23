import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, TrendingUp, Users, Calendar, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function BatchAnalytics() {
  const location = useLocation();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const urlParams = new URLSearchParams(location.search);
      const batchId = urlParams.get('batch_id');

      const batchData = await base44.entities.Batch.get(batchId);
      const studentsData = await base44.entities.Student.filter({ batch_id: batchData.batch_id });
      const sessionsData = await base44.entities.Session.filter({ batch_id: batchData.batch_id }, '-session_date');
      const attendanceData = await base44.entities.AttendanceRecord.filter({ batch_id: batchData.batch_id });

      setBatch(batchData);
      setStudents(studentsData);
      setSessions(sessionsData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error("Error fetching batch analytics:", error);
    }
    setLoading(false);
  };

  const calculateAttendanceStats = () => {
    const totalSessions = sessions.length;
    const studentStats = students.map(student => {
      const studentAttendance = attendance.filter(a => a.student_id === student.id && a.is_present);
      const percentage = totalSessions > 0 ? (studentAttendance.length / totalSessions) * 100 : 0;
      return {
        ...student,
        attended: studentAttendance.length,
        percentage: percentage.toFixed(1)
      };
    });

    return studentStats.sort((a, b) => b.percentage - a.percentage);
  };

  const downloadHTMLReport = () => {
    const studentStats = calculateAttendanceStats();
    const avgAttendance = studentStats.length > 0 
      ? (studentStats.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / studentStats.length).toFixed(1)
      : 0;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${batch.batch_name} - Advanced Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 36px; margin-bottom: 10px; }
    .header p { font-size: 18px; opacity: 0.9; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-card h3 { color: #667eea; font-size: 14px; margin-bottom: 10px; }
    .stat-card p { font-size: 36px; font-weight: bold; color: #333; }
    .content { padding: 30px; }
    .section { margin-bottom: 40px; }
    .section h2 {
      font-size: 24px;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
    }
    tr:hover { background: #f8f9fa; }
    .progress-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Advanced Batch Analytics</h1>
      <p>${batch.batch_name} | ${batch.college_name || 'KIT Kolhapur'}</p>
      <p style="font-size: 14px; margin-top: 10px;">Generated on ${format(new Date(), 'PPP')}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>👥 TOTAL STUDENTS</h3>
        <p>${students.length}</p>
      </div>
      <div class="stat-card">
        <h3>📚 TOTAL SESSIONS</h3>
        <p>${sessions.length}</p>
      </div>
      <div class="stat-card">
        <h3>📊 AVG ATTENDANCE</h3>
        <p>${avgAttendance}%</p>
      </div>
      <div class="stat-card">
        <h3>✅ COMPLETED</h3>
        <p>${sessions.filter(s => s.status === 'completed').length}</p>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h2>📈 Student Attendance Overview</h2>
        <table>
          <thead>
            <tr>
              <th>Roll No</th>
              <th>Student Name</th>
              <th>PRN</th>
              <th>Sessions Attended</th>
              <th>Attendance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${studentStats.map(s => `
              <tr>
                <td><strong>${s.roll_no}</strong></td>
                <td>${s.name}</td>
                <td>${s.prn || 'N/A'}</td>
                <td>${s.attended} / ${sessions.length}</td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <strong>${s.percentage}%</strong>
                    <div class="progress-bar" style="flex: 1;">
                      <div class="progress-fill" style="width: ${s.percentage}%;"></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge ${
                    parseFloat(s.percentage) >= 75 ? 'badge-success' : 
                    parseFloat(s.percentage) >= 50 ? 'badge-warning' : 
                    'badge-danger'
                  }">
                    ${parseFloat(s.percentage) >= 75 ? '✅ Good' : parseFloat(s.percentage) >= 50 ? '⚠️ Low' : '❌ Critical'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>📅 Session History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Session Name</th>
              <th>Topic</th>
              <th>Faculty</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => {
              const sessionAttendance = attendance.filter(a => a.session_id === session.id && a.is_present).length;
              const attendancePercentage = session.total_students > 0 
                ? ((sessionAttendance / session.total_students) * 100).toFixed(1)
                : 0;
              
              return `
                <tr>
                  <td>${format(new Date(session.session_date), 'PP')}</td>
                  <td><strong>${session.session_name}</strong></td>
                  <td>${session.topic_taught}</td>
                  <td>${session.faculty_name}</td>
                  <td>${sessionAttendance}/${session.total_students || students.length} (${attendancePercentage}%)</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${batch.batch_name}_Analytics_Report.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const studentStats = calculateAttendanceStats();
  const avgAttendance = studentStats.length > 0 
    ? (studentStats.reduce((sum, s) => sum + parseFloat(s.percentage), 0) / studentStats.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Batches"))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">📊 Advanced Batch Analytics</h1>
            <p className="text-gray-600">{batch.batch_name} - {batch.college_name || 'KIT Kolhapur'}</p>
          </div>
          <Button 
            onClick={downloadHTMLReport}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Total Students</p>
              <h3 className="text-4xl font-bold text-gray-900">{students.length}</h3>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <h3 className="text-4xl font-bold text-gray-900">{sessions.length}</h3>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Avg Attendance</p>
              <h3 className="text-4xl font-bold text-gray-900">{avgAttendance}%</h3>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Completed</p>
              <h3 className="text-4xl font-bold text-gray-900">
                {sessions.filter(s => s.status === 'completed').length}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Student Attendance Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📈 Student Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Roll No</th>
                    <th className="px-6 py-3 text-left font-semibold">Student Name</th>
                    <th className="px-6 py-3 text-left font-semibold">PRN</th>
                    <th className="px-6 py-3 text-center font-semibold">Attended</th>
                    <th className="px-6 py-3 text-center font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map(student => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-semibold">{student.roll_no}</td>
                      <td className="px-6 py-4">{student.name}</td>
                      <td className="px-6 py-4">{student.prn || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">{student.attended} / {sessions.length}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                              style={{ width: `${student.percentage}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold w-16 text-right">{student.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader>
            <CardTitle>📅 Session History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Session</th>
                    <th className="px-6 py-3 text-left font-semibold">Topic</th>
                    <th className="px-6 py-3 text-left font-semibold">Faculty</th>
                    <th className="px-6 py-3 text-center font-semibold">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const sessionAttendance = attendance.filter(a => a.session_id === session.id && a.is_present).length;
                    const total = session.total_students || students.length;
                    const percentage = total > 0 ? ((sessionAttendance / total) * 100).toFixed(1) : 0;
                    
                    return (
                      <tr key={session.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">{format(new Date(session.session_date), 'PP')}</td>
                        <td className="px-6 py-4 font-semibold">{session.session_name}</td>
                        <td className="px-6 py-4">{session.topic_taught}</td>
                        <td className="px-6 py-4">{session.faculty_name}</td>
                        <td className="px-6 py-4 text-center">
                          {sessionAttendance}/{total} ({percentage}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}