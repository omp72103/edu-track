import React, { useState, useRef } from "react";
import { College } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, TrendingUp, FileSpreadsheet, Sparkles, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const years = ["First Year", "Second Year", "Third Year", "Fourth Year"];
const branches = [
  "Computer Science Engineering",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
  "Computer Science & Business Systems",
  "Electronics & Telecommunication",
  "Information Technology",
  "Mechanical Engineering",
  "Civil Engineering",
  "Textile Engineering",
  "Bio-Technology Engineering",
  "Chemical Engineering",
  "Environmental Engineering",
  "Electrical Engineering",
  "Production Engineering"
];

export default function AdvancedAnalysis() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [colleges, setColleges] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    college_name: "",
    year: "",
    branch: "",
    division: ""
  });

  React.useEffect(() => {
    const loadColleges = async () => {
      try {
        const collegeData = await College.list();
        setColleges(collegeData);
      } catch (error) {
        console.error("Error loading colleges:", error);
      }
    };
    loadColleges();
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv') || 
                 file.type === 'application/vnd.ms-excel' || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
      setMessage(null);
    } else {
      setMessage({ type: "error", text: "Please select a valid CSV or Excel file" });
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }
    return { headers, data };
  };

  const analyzeAttendanceTrends = (headers, data) => {
    // Extract date columns (skip Roll No, PRN, Name)
    const dateColumns = headers.filter(h => 
      h.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/) || h.match(/\d{1,2}\/\d{1,2}/)
    );

    const students = data.map(row => ({
      name: row['Student Name'] || row['Name'] || '',
      rollNo: row['Roll No.'] || row['Roll No'] || '',
      prn: row['PRN'] || ''
    }));

    // Calculate attendance for each date
    const attendanceByDate = dateColumns.map(date => {
      let present = 0;
      data.forEach(row => {
        const value = row[date]?.toUpperCase();
        if (value === 'P' || value === 'A' || value === 'PRESENT') {
          present++;
        }
      });
      return {
        date,
        present,
        total: data.length,
        percentage: data.length > 0 ? ((present / data.length) * 100).toFixed(1) : 0
      };
    });

    // Calculate individual student attendance
    const studentAttendance = students.map(student => {
      const studentRow = data.find(r => 
        r['Student Name'] === student.name || r['Name'] === student.name
      );
      if (!studentRow) return { ...student, present: 0, total: 0, percentage: 0 };

      let present = 0;
      dateColumns.forEach(date => {
        const value = studentRow[date]?.toUpperCase();
        if (value === 'P' || value === 'A' || value === 'PRESENT') {
          present++;
        }
      });

      return {
        ...student,
        present,
        total: dateColumns.length,
        percentage: dateColumns.length > 0 ? ((present / dateColumns.length) * 100).toFixed(1) : 0
      };
    });

    // Sort students by attendance percentage
    studentAttendance.sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));

    return { attendanceByDate, studentAttendance, totalSessions: dateColumns.length };
  };

  const generateHTMLReport = (analysis, batchInfo) => {
    const { attendanceByDate, studentAttendance, totalSessions } = analysis;
    
    const overallAttendance = attendanceByDate.length > 0 
      ? (attendanceByDate.reduce((sum, d) => sum + parseFloat(d.percentage), 0) / attendanceByDate.length).toFixed(1)
      : 0;

    const topPerformers = studentAttendance.slice(0, 10);
    const needsAttention = studentAttendance.filter(s => parseFloat(s.percentage) < 75).slice(0, 10);

    const chartData = attendanceByDate.map(d => `['${d.date}', ${d.percentage}]`).join(',');
    const studentChartData = studentAttendance.slice(0, 20).map(s => 
      `['${s.name.substring(0, 15)}', ${s.percentage}]`
    ).join(',');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Analysis - ${batchInfo.college_name}</title>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            animation: fadeIn 1s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            margin-bottom: 30px;
            animation: slideDown 0.8s ease-out;
        }
        @keyframes slideDown {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .batch-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        .info-label {
            font-size: 0.85em;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-value {
            font-size: 1.2em;
            color: #333;
            font-weight: bold;
            margin-top: 5px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            animation: scaleIn 0.5s ease-out;
            animation-fill-mode: both;
            transition: transform 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        .stat-icon {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-top: 10px;
        }
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            animation: fadeInUp 0.8s ease-out;
        }
        @keyframes fadeInUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .chart-title {
            font-size: 1.5em;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        .students-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .student-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            border-left: 5px solid #667eea;
            transition: all 0.3s ease;
            animation: fadeInUp 0.5s ease-out;
            animation-fill-mode: both;
        }
        .student-card:hover {
            transform: translateX(5px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .student-name {
            font-weight: bold;
            font-size: 1.1em;
            color: #333;
            margin-bottom: 5px;
        }
        .student-details {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 10px;
        }
        .progress-bar {
            height: 8px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 1s ease-out;
            animation: fillBar 1.5s ease-out;
        }
        @keyframes fillBar {
            from { width: 0; }
        }
        .percentage {
            font-size: 1.2em;
            font-weight: bold;
            color: #667eea;
            margin-top: 5px;
        }
        .attention {
            border-left-color: #e74c3c;
        }
        .attention .progress-fill {
            background: linear-gradient(90deg, #e74c3c 0%, #c0392b 100%);
        }
        .attention .percentage {
            color: #e74c3c;
        }
        .section-title {
            font-size: 1.8em;
            color: white;
            margin: 30px 0 20px 0;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .footer {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .footer p {
            color: #666;
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Advanced Attendance Analysis Report</h1>
            <div class="batch-info">
                <div class="info-item">
                    <div class="info-label">College</div>
                    <div class="info-value">${batchInfo.college_name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Branch</div>
                    <div class="info-value">${batchInfo.branch}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Year</div>
                    <div class="info-value">${batchInfo.year}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Division</div>
                    <div class="info-value">${batchInfo.division || 'All'}</div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-label">Total Students</div>
                <div class="stat-value">${studentAttendance.length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-label">Total Sessions</div>
                <div class="stat-value">${totalSessions}</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-label">Overall Attendance</div>
                <div class="stat-value">${overallAttendance}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚠️</div>
                <div class="stat-label">Below 75%</div>
                <div class="stat-value">${needsAttention.length}</div>
            </div>
        </div>

        <div class="chart-container">
            <h2 class="chart-title">📊 Attendance Trend Over Time</h2>
            <div id="line_chart" style="width: 100%; height: 400px;"></div>
        </div>

        <div class="chart-container">
            <h2 class="chart-title">📊 Student-wise Attendance (Top 20)</h2>
            <div id="bar_chart" style="width: 100%; height: 500px;"></div>
        </div>

        <h2 class="section-title">🏆 Top Performers (>90% Attendance)</h2>
        <div class="students-grid">
            ${topPerformers.map((student, index) => `
                <div class="student-card" style="animation-delay: ${index * 0.05}s;">
                    <div class="student-name">${student.name}</div>
                    <div class="student-details">Roll: ${student.rollNo} | PRN: ${student.prn}</div>
                    <div class="percentage">${student.percentage}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${student.percentage}%;"></div>
                    </div>
                    <div style="margin-top: 5px; color: #666; font-size: 0.85em;">
                        ${student.present}/${student.total} sessions
                    </div>
                </div>
            `).join('')}
        </div>

        ${needsAttention.length > 0 ? `
        <h2 class="section-title">⚠️ Students Needing Attention (<75% Attendance)</h2>
        <div class="students-grid">
            ${needsAttention.map((student, index) => `
                <div class="student-card attention" style="animation-delay: ${index * 0.05}s;">
                    <div class="student-name">${student.name}</div>
                    <div class="student-details">Roll: ${student.rollNo} | PRN: ${student.prn}</div>
                    <div class="percentage">${student.percentage}%</div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${student.percentage}%;"></div>
                    </div>
                    <div style="margin-top: 5px; color: #666; font-size: 0.85em;">
                        ${student.present}/${student.total} sessions
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <p><strong>Report Generated:</strong> ${format(new Date(), 'PPP p')}</p>
            <p><strong>Powered by APT-TECH</strong> | Advanced Attendance Analytics System</p>
            <p style="margin-top: 10px; font-size: 0.9em; color: #999;">This is an automated analysis report</p>
        </div>
    </div>

    <script type="text/javascript">
        google.charts.load('current', {'packages':['corechart']});
        google.charts.setOnLoadCallback(drawCharts);

        function drawCharts() {
            // Line Chart
            var lineData = google.visualization.arrayToDataTable([
                ['Date', 'Attendance %'],
                ${chartData}
            ]);

            var lineOptions = {
                title: 'Session-wise Attendance Trend',
                curveType: 'function',
                legend: { position: 'bottom' },
                colors: ['#667eea'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Attendance %',
                    minValue: 0,
                    maxValue: 100
                },
                hAxis: { 
                    title: 'Session Date',
                    slantedText: true,
                    slantedTextAngle: 45
                }
            };

            var lineChart = new google.visualization.LineChart(document.getElementById('line_chart'));
            lineChart.draw(lineData, lineOptions);

            // Bar Chart
            var barData = google.visualization.arrayToDataTable([
                ['Student', 'Attendance %'],
                ${studentChartData}
            ]);

            var barOptions = {
                title: 'Top 20 Students by Attendance',
                legend: { position: 'none' },
                colors: ['#667eea'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Attendance %',
                    minValue: 0,
                    maxValue: 100
                },
                hAxis: { 
                    title: 'Student Name',
                    slantedText: true,
                    slantedTextAngle: 45
                }
            };

            var barChart = new google.visualization.ColumnChart(document.getElementById('bar_chart'));
            barChart.draw(barData, barOptions);
        }

        // Responsive charts
        window.addEventListener('resize', function() {
            drawCharts();
        });
    </script>
</body>
</html>`;
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a CSV or Excel file" });
      return;
    }

    if (!formData.college_name || !formData.year || !formData.branch) {
      setMessage({ type: "error", text: "Please fill in all batch details" });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const { headers, data } = parseCSV(text);

        if (data.length === 0) {
          setMessage({ type: "error", text: "No data found in the uploaded file" });
          setIsProcessing(false);
          return;
        }

        const analysis = analyzeAttendanceTrends(headers, data);
        const htmlReport = generateHTMLReport(analysis, formData);

        // Download HTML report
        const blob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Attendance_Analysis_${formData.college_name}_${formData.branch}_${format(new Date(), 'dd-MM-yyyy')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setMessage({ 
          type: "success", 
          text: `✅ Analysis complete! HTML report downloaded successfully. Found ${data.length} students across ${analysis.totalSessions} sessions.` 
        });
        setIsProcessing(false);
      };

      reader.readAsText(selectedFile);
    } catch (error) {
      console.error("Analysis error:", error);
      setMessage({ type: "error", text: `Error analyzing file: ${error.message}` });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="bg-white"
          >
            <span className="text-xl">←</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              Advanced Attendance Analysis
            </h1>
            <p className="text-gray-600 mt-1">Upload attendance data and generate stunning analytical reports</p>
          </div>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-xl border-2 border-purple-100">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Upload & Analyze Attendance Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Batch Details Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Step 1: Enter Batch Details
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">College Name *</Label>
                  <Select value={formData.college_name} onValueChange={(value) => setFormData({...formData, college_name: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select college" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((college) => (
                        <SelectItem key={college.id} value={college.college_name}>
                          {college.short_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold">Academic Year *</Label>
                  <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold">Branch *</Label>
                  <Select value={formData.branch} onValueChange={(value) => setFormData({...formData, branch: value})}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-semibold">Division (Optional)</Label>
                  <Input
                    placeholder="e.g., A, B, C"
                    value={formData.division}
                    onChange={(e) => setFormData({...formData, division: e.target.value})}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5" />
                Step 2: Upload Attendance File
              </h3>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-purple-50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : "Drop your CSV/Excel file here"}
                </h3>
                <p className="text-gray-600 text-sm">
                  Upload attendance sheet with columns: Roll No, PRN, Student Name, and date columns
                </p>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isProcessing || !selectedFile}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Analyzing Data...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Advanced Analysis Report
                  <Download className="w-5 h-5" />
                </div>
              )}
            </Button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">📊 What You'll Get:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✨ Beautifully designed animated HTML report</li>
                <li>📈 Interactive attendance trend charts</li>
                <li>👥 Student-wise performance analysis</li>
                <li>🏆 Top performers identification</li>
                <li>⚠️ Students needing attention alerts</li>
                <li>📊 Overall batch statistics and insights</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}