import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentAnalysis({ student }) {
  const [performance, setPerformance] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysisData();
  }, [student]);

  const fetchAnalysisData = async () => {
    try {
      const performanceData = await base44.entities.StudentPerformance.filter({
        student_id: student.id
      });
      
      const attendanceData = await base44.entities.AttendanceRecord.filter({
        student_id: student.id
      });

      setPerformance(performanceData);
      setAttendance(attendanceData);
    } catch (error) {
      console.error("Error fetching analysis data:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="h-64 bg-gray-200 rounded animate-pulse"></div>;
  }

  const subjectPerformance = {};
  performance.forEach(p => {
    if (!subjectPerformance[p.subject]) {
      subjectPerformance[p.subject] = { total: 0, count: 0, grades: [] };
    }
    subjectPerformance[p.subject].total += p.percentage || 0;
    subjectPerformance[p.subject].count++;
    subjectPerformance[p.subject].grades.push(p.grade);
  });

  const avgPerformance = Object.entries(subjectPerformance).map(([subject, data]) => ({
    subject,
    average: (data.total / data.count).toFixed(1),
    assessments: data.count
  }));

  const overallAvg = performance.length > 0
    ? (performance.reduce((sum, p) => sum + (p.percentage || 0), 0) / performance.length).toFixed(1)
    : 0;

  const attendancePercentage = attendance.length > 0
    ? Math.round((attendance.filter(a => a.is_present).length / attendance.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📈 Analysis & Performance</h1>
          <p className="text-gray-600 mt-1">Track your academic progress</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Overall Average</p>
            <h3 className="text-4xl font-bold text-gray-900">{overallAvg}%</h3>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Total Assessments</p>
            <h3 className="text-4xl font-bold text-gray-900">{performance.length}</h3>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Attendance</p>
            <h3 className="text-4xl font-bold text-gray-900">{attendancePercentage}%</h3>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Performance */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle>Subject-wise Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {avgPerformance.length > 0 ? (
            <div className="space-y-4">
              {avgPerformance.map(item => (
                <div key={item.subject} className="p-4 bg-white border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{item.subject}</h4>
                    <span className="text-2xl font-bold text-blue-600">{item.average}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${item.average}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{item.assessments} assessments</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}