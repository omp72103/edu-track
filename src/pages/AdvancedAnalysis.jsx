import React, { useState, useRef } from "react";
import { College } from "@/entities/all";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, TrendingUp, FileSpreadsheet, Sparkles, Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, parse } from "date-fns";

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
                 file.type === 'application/vnd.ms-excel' || file.name.endsWith('.xlsx') ||
                 file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      setSelectedFile(file);
      setMessage(null);
    } else {
      setMessage({ type: "error", text: "Please select a valid CSV, Excel, or PDF file" });
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
    // Parse CSV with proper quote handling
    const parseLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length > 3 && values.some(v => v)) { // At least has some data
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }
    
    return { headers, data };
  };

  const cleanAndValidateData = (rawHeaders, rawData) => {
    const cleaningLog = [];
    
    // Step 1: Standardize column names
    const columnMapping = {
      'SL NO': ['SL NO', 'SL NO.', 'SL.NO.', 'SLNO', 'SERIAL NO', 'SR NO', 'SR.NO.', 'Roll No.', 'Roll No', 'ROLL NO', 'ROLL NO.'],
      'PRN': ['PRN', 'P.R.N.', 'PRN NO', 'PRN NUMBER'],
      'STUDENT NAME': ['STUDENT NAME', 'NAME', 'STUDENT', 'FULL NAME', 'Name', 'Student Name']
    };
    
    const standardizeColumnName = (col) => {
      const upper = col.toUpperCase().trim();
      for (const [standard, variants] of Object.entries(columnMapping)) {
        if (variants.some(v => upper === v.toUpperCase() || upper.includes(v.toUpperCase()))) {
          if (upper !== standard) cleaningLog.push(`Standardized column "${col}" → "${standard}"`);
          return standard;
        }
      }
      return col.trim();
    };
    
    const headers = rawHeaders.map(h => standardizeColumnName(h));
    
    // Step 2: Normalize attendance values
    const normalizeAttendance = (val) => {
      if (!val) return '';
      const normalized = val.toString().trim().toUpperCase();
      
      // Present variations
      if (['P', 'PRESENT', '✓', 'YES', 'Y', '1'].includes(normalized)) return 'P';
      
      // Absent variations
      if (['A', 'ABSENT', 'X', 'NO', 'N', '0', '-'].includes(normalized)) return 'A';
      
      return val;
    };
    
    let data = rawData.map((row, idx) => {
      const cleanedRow = {};
      headers.forEach((header, i) => {
        const originalHeader = rawHeaders[i];
        const value = row[originalHeader];
        
        // Normalize attendance for non-metadata columns
        const isMetadata = ['SL NO', 'PRN', 'STUDENT NAME'].includes(header);
        cleanedRow[header] = isMetadata ? (value || '').toString().trim() : normalizeAttendance(value);
      });
      return cleanedRow;
    });
    
    // Step 3: Remove duplicates
    const seen = new Set();
    const originalCount = data.length;
    data = data.filter((row) => {
      const key = `${row['STUDENT NAME']}_${row['PRN']}`.toLowerCase();
      if (seen.has(key)) {
        cleaningLog.push(`Removed duplicate: ${row['STUDENT NAME']}`);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (originalCount > data.length) {
      cleaningLog.push(`Removed ${originalCount - data.length} duplicate entries`);
    }
    
    // Step 4: Standardize date formats in headers
    const standardizeDateColumn = (col) => {
      const dateMatch = col.match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3];
        if (year.length === 2) year = '20' + year;
        
        const timeOfDay = col.match(/(morning|afternoon|evening)/i)?.[1] || '';
        const standardized = timeOfDay 
          ? `${day}.${month}.${year} ${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1).toLowerCase()}`
          : `${day}.${month}.${year}`;
        
        if (standardized !== col) {
          cleaningLog.push(`Standardized date column "${col}" → "${standardized}"`);
        }
        return standardized;
      }
      return col;
    };
    
    const finalHeaders = headers.map(h => standardizeDateColumn(h));
    const finalData = data.map(row => {
      const newRow = {};
      headers.forEach((oldHeader, i) => {
        newRow[finalHeaders[i]] = row[oldHeader];
      });
      return newRow;
    });
    
    cleaningLog.unshift(`✅ Cleaned ${finalData.length} student records`);
    console.log('Data cleaning complete:', cleaningLog);
    
    return { headers: finalHeaders, data: finalData, cleaningLog };
  };

  const analyzeAttendanceTrends = (headers, data) => {
    console.log('🔍 Analyzing attendance trends...', { 
      totalHeaders: headers.length, 
      headers: headers,
      dataLength: data.length,
      sampleRow: data[0]
    });
    
    // Extract date columns - look for any column that's NOT metadata columns
    const metadataColumns = ['SL NO', 'PRN', 'STUDENT NAME'];
    const dateColumns = headers.filter(h => {
      const upper = h.toUpperCase().trim();
      
      // Check if this is a metadata column
      const isMetadata = metadataColumns.some(meta => upper === meta || upper.includes(meta));
      if (isMetadata) {
        console.log(`❌ Skipping metadata column: ${h}`);
        return false;
      }
      
      // Check if this column has attendance data
      let pCount = 0;
      let aCount = 0;
      data.forEach(row => {
        const val = row[h]?.toString().trim().toUpperCase();
        if (val === 'P' || val === 'PRESENT' || val === '✓') pCount++;
        if (val === 'A' || val === 'ABSENT' || val === 'X') aCount++;
      });
      
      const hasData = pCount > 0 || aCount > 0;
      console.log(`${hasData ? '✅' : '❌'} Column "${h}": P=${pCount}, A=${aCount}`);
      
      return hasData;
    });

    console.log('📅 Final detected date columns:', dateColumns);

    const students = data.map(row => ({
      name: row['STUDENT NAME'] || row['Student Name'] || row['Name'] || row['NAME'] || row['name'] || '',
      rollNo: row['SL NO'] || row['SL NO.'] || row['Roll No.'] || row['Roll No'] || row['ROLL NO'] || row['Serial No'] || '',
      prn: row['PRN'] || row['prn'] || ''
    })).filter(s => s.name && s.name.trim().length > 0);

    console.log('👥 Detected students:', students.length);
    
    if (dateColumns.length === 0) {
      console.error('❌ No date columns detected!', { 
        headers,
        sampleData: data.slice(0, 2)
      });
      throw new Error('No attendance columns detected in the file');
    }

    // Calculate attendance for each date column
    const attendanceByDate = dateColumns.map(dateCol => {
      let present = 0;
      data.forEach(row => {
        const value = row[dateCol]?.toString().trim().toUpperCase();
        if (value === 'P' || value === 'PRESENT' || value === '✓') {
          present++;
        }
      });
      
      // Simplify date display
      let displayDate = dateCol;
      const dateMatch = dateCol.match(/(\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4})/);
      if (dateMatch) {
        displayDate = dateMatch[1];
      }
      
      const result = {
        date: displayDate,
        present,
        total: students.length,
        percentage: students.length > 0 ? ((present / students.length) * 100).toFixed(1) : 0
      };
      
      console.log(`📊 Session "${dateCol}": ${result.present}/${result.total} (${result.percentage}%)`);
      
      return result;
    });

    console.log('✅ Attendance by date calculated:', attendanceByDate.length);

    // Calculate individual student attendance
    const studentAttendance = students.map(student => {
      const studentRow = data.find(r => {
        const rowName = (r['STUDENT NAME'] || r['Student Name'] || r['Name'] || r['NAME'] || r['name'] || '').trim();
        return rowName === student.name.trim();
      });
      
      if (!studentRow) return { ...student, present: 0, total: 0, percentage: 0 };

      let present = 0;
      dateColumns.forEach(dateCol => {
        const value = studentRow[dateCol]?.toString().trim().toUpperCase();
        if (value === 'P' || value === 'PRESENT' || value === '✓') {
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

    console.log('Analysis complete:', { sessions: dateColumns.length, students: students.length });

    return { attendanceByDate, studentAttendance, totalSessions: dateColumns.length };
  };

  const generateHTMLReport = (analysis, batchInfo) => {
    const { attendanceByDate, studentAttendance, totalSessions } = analysis;
    
    const overallAttendance = attendanceByDate.length > 0 
      ? (attendanceByDate.reduce((sum, d) => sum + parseFloat(d.percentage), 0) / attendanceByDate.length).toFixed(1)
      : 0;

    const topPerformers = studentAttendance.slice(0, 10);
    const needsAttention = studentAttendance.filter(s => parseFloat(s.percentage) < 75).slice(0, 10);

    const chartData = attendanceByDate.map(d => `['${d.date.replace(/'/g, "\\'")}', ${parseFloat(d.percentage)}]`).join(',');
    const studentChartData = studentAttendance.slice(0, 20).map(s => 
      `['${s.name.substring(0, 20).replace(/'/g, "\\'")}', ${parseFloat(s.percentage)}]`
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
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
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
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 25px;
            box-shadow: 0 25px 70px rgba(0,0,0,0.4);
            text-align: center;
            margin-bottom: 30px;
            animation: slideDown 0.8s ease-out;
            border: 2px solid rgba(255,255,255,0.3);
        }
        @keyframes slideDown {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .header h1 {
            font-size: 3em;
            margin-bottom: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 900;
            text-shadow: 2px 2px 20px rgba(102, 126, 234, 0.3);
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
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
            backdrop-filter: blur(10px);
            padding: 35px;
            border-radius: 20px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.25);
            animation: scaleIn 0.5s ease-out;
            animation-fill-mode: both;
            transition: all 0.4s ease;
            border: 2px solid rgba(255,255,255,0.5);
        }
        .stat-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 50px rgba(0,0,0,0.35);
            border-color: rgba(102, 126, 234, 0.6);
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
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 100%);
            backdrop-filter: blur(10px);
            padding: 35px;
            border-radius: 25px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            margin-bottom: 30px;
            animation: fadeInUp 0.8s ease-out;
            border: 2px solid rgba(255,255,255,0.4);
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
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
            backdrop-filter: blur(10px);
            padding: 25px;
            border-radius: 18px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            border-left: 6px solid transparent;
            border-image: linear-gradient(135deg, #667eea, #764ba2) 1;
            transition: all 0.4s ease;
            animation: fadeInUp 0.5s ease-out;
            animation-fill-mode: both;
            border: 2px solid rgba(255,255,255,0.3);
            border-left: 6px solid #667eea;
        }
        .student-card:hover {
            transform: translateX(10px) scale(1.03);
            box-shadow: 0 15px 35px rgba(0,0,0,0.25);
            border-left-color: #764ba2;
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
            font-size: 2.2em;
            color: white;
            margin: 40px 0 25px 0;
            font-weight: 900;
            text-shadow: 3px 3px 10px rgba(0,0,0,0.5);
            background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
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
      setMessage({ type: "error", text: "Please select a file to analyze" });
      return;
    }

    if (!formData.college_name || !formData.year || !formData.branch) {
      setMessage({ type: "error", text: "Please fill in all batch details" });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: "info", text: "🔄 Processing your file..." });

    try {
      let headers, data;

      // Handle PDF files with OCR
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        setMessage({ type: "info", text: "📄 Uploading PDF for OCR analysis..." });
        
        const { file_url } = await UploadFile({ file: selectedFile });

        setMessage({ type: "info", text: "🔍 Extracting attendance data from PDF..." });

        const ocrSchema = {
          type: "object",
          properties: {
            students: {
              type: "array",
              description: `This is an attendance sheet with multiple pages. Extract EVERY student record you see.
              
              The table structure is:
              - Column 1: SL NO (serial numbers 1-73)
              - Column 2: PRN (student IDs like 24UET001, 24UET002, etc.)
              - Column 3: STUDENT NAME (full names in CAPITAL LETTERS)
              - Remaining columns: Date-time slots with attendance marked as 'P' (Present) or 'A' (Absent)
              
              Date-time columns follow this pattern across different dates: "DD.MM.YYYY Morning", "DD.MM.YYYY Afternoon", "DD.MM.YYYY Evening"
              For example: "08.12.2025 Morning", "08.12.2025 Afternoon", "08.12.2025 Evening", "9.12.2025 Morning", etc.
              
              IMPORTANT: There are 3 shifts per day (Morning, Afternoon, Evening). Extract attendance for ALL date-time combinations you find.
              
              Extract all ~73 students with their complete attendance records.`,
              items: {
                type: "object",
                properties: {
                  sl_no: { 
                    type: "string", 
                    description: "Serial number from first column (1, 2, 3...73)" 
                  },
                  prn: { 
                    type: "string", 
                    description: "PRN from second column (e.g., 24UET001, 24UET002, 22UET079, 23UET059)" 
                  },
                  name: { 
                    type: "string", 
                    description: "Full student name from third column (e.g., ADITYA RAVINDRA CHOUGULE, AITAWADE VIDHI RAJENDRA)" 
                  },
                  attendance: {
                    type: "object",
                    description: "Object where each key is a date-time combination (like '08.12.2025 Morning', '08.12.2025 Afternoon', '08.12.2025 Evening', '9.12.2025 Morning', '10.12.2026 Afternoon', '11.12.202 Morning', '12.12.2025 Morning', '12.12.2025 Afternoon', '13.12.2025 Evening', '13.12.2025 Morning') and value is either 'P' or 'A'",
                    additionalProperties: { 
                      type: "string"
                    }
                  }
                },
                required: ["name", "attendance"]
              }
            }
          },
          required: ["students"]
        };

        const ocrResult = await ExtractDataFromUploadedFile({
          file_url,
          json_schema: ocrSchema
        });

        if (ocrResult.status !== "success" || !ocrResult.output?.students) {
          throw new Error("Failed to extract data from PDF");
        }

        // Convert OCR result to CSV-like format
        const students = ocrResult.output.students;
        
        if (!students || students.length === 0) {
          throw new Error("PDF extraction failed. The PDF structure may be too complex. Try converting to CSV/Excel first.");
        }
        
        console.log('✅ OCR extracted:', { 
          studentCount: students.length,
          sampleStudents: students.slice(0, 3)
        });

        // Collect all unique date-time columns from all students
        const allDateColumns = new Set();
        students.forEach(student => {
          Object.keys(student.attendance || {}).forEach(dateKey => {
            if (dateKey.trim()) allDateColumns.add(dateKey.trim());
          });
        });

        const dateColumns = Array.from(allDateColumns);
        console.log('📅 Detected session columns:', dateColumns);

        if (dateColumns.length === 0) {
          throw new Error("No attendance date columns found in PDF. Please check the file format.");
        }

        // Sort date columns chronologically with proper time-of-day ordering
        const sortedDateColumns = dateColumns.sort((a, b) => {
          const parseDateTime = (str) => {
            const match = str.match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})/);
            if (!match) return { date: new Date(0), shift: 0 };
            
            const year = match[3].length === 2 ? '20' + match[3] : match[3];
            const date = new Date(year, match[2] - 1, match[1]);
            
            let shift = 0;
            if (str.toLowerCase().includes('morning')) shift = 0;
            else if (str.toLowerCase().includes('afternoon')) shift = 1;
            else if (str.toLowerCase().includes('evening')) shift = 2;
            
            return { date, shift };
          };
          
          const aData = parseDateTime(a);
          const bData = parseDateTime(b);
          
          if (aData.date.getTime() !== bData.date.getTime()) {
            return aData.date - bData.date;
          }
          return aData.shift - bData.shift;
        });

        console.log('📊 Sorted sessions:', sortedDateColumns);

        // Build CSV-like structure
        headers = ['SL NO', 'PRN', 'STUDENT NAME', ...sortedDateColumns];
        data = students.map(student => {
          const row = {
            'SL NO': student.sl_no || student.roll_no || '',
            'PRN': student.prn || '',
            'STUDENT NAME': student.name || student.student_name || ''
          };
          
          sortedDateColumns.forEach(dateCol => {
            row[dateCol] = student.attendance?.[dateCol] || '';
          });
          
          return row;
        }).filter(row => row['STUDENT NAME'] && row['STUDENT NAME'].length > 2);

        console.log('✅ Final structured data:', { 
          students: data.length, 
          sessions: sortedDateColumns.length,
          headers,
          sample: data[0]
        });
        
        if (data.length === 0) {
          throw new Error("No valid student records found after processing");
        }
        
        setMessage({ type: "info", text: `✅ Extracted ${data.length} students with ${sortedDateColumns.length} attendance sessions (3 shifts/day)!` });
      } else {
        // Handle CSV files
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
            const text = e.target.result;
            const parsed = parseCSV(text);
            headers = parsed.headers;
            data = parsed.data;
            console.log('CSV Parsed:', { headers, dataLength: data.length, firstRow: data[0] });
            resolve();
          };
          reader.readAsText(selectedFile);
        });
      }

      if (data.length === 0) {
        setMessage({ type: "error", text: "No data found in the uploaded file" });
        setIsProcessing(false);
        return;
      }

      console.log('Data ready for cleaning:', { headers, dataCount: data.length });

      setMessage({ type: "info", text: "🧹 Cleaning and validating data..." });

      // Clean and validate the data
      const cleaned = cleanAndValidateData(headers, data);
      headers = cleaned.headers;
      data = cleaned.data;

      console.log('Data after cleaning:', { headers, dataCount: data.length, cleaningLog: cleaned.cleaningLog });

      if (cleaned.cleaningLog.length > 1) {
        setMessage({ 
          type: "info", 
          text: `✅ ${cleaned.cleaningLog[0]} | ${cleaned.cleaningLog.slice(1, 3).join(', ')}` 
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setMessage({ type: "info", text: "📊 Analyzing attendance trends..." });

      const analysis = analyzeAttendanceTrends(headers, data);

      console.log('Analysis results:', { 
        totalStudents: analysis.studentAttendance.length, 
        totalSessions: analysis.totalSessions,
        attendanceByDate: analysis.attendanceByDate.length
      });

      if (analysis.totalSessions === 0 || analysis.studentAttendance.length === 0) {
        setMessage({ 
          type: "error", 
          text: "Could not detect attendance data in the file. Please ensure your file has student names and attendance columns marked with 'P', 'A', 'Present', or 'Absent'." 
        });
        setIsProcessing(false);
        return;
      }

      const htmlReport = generateHTMLReport(analysis, formData);

      // Download HTML report
      const blob = new Blob([htmlReport], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Analysis_${formData.college_name.replace(/[^a-zA-Z0-9]/g, '_')}_${formData.branch.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ 
        type: "success", 
        text: `✅ Analysis complete! HTML report downloaded successfully. Found ${data.length} students across ${analysis.totalSessions} sessions.` 
      });
      setIsProcessing(false);
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
                className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-gradient-to-br from-purple-50 to-blue-50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : "Drop your PDF, CSV, or Excel file here"}
                </h3>
                <p className="text-gray-600 text-sm">
                  Upload attendance sheet (PDF with OCR support or CSV/Excel)
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
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6 shadow-lg"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin w-5 h-5" />
                  {message?.text || "Analyzing Data..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate Stunning Analysis Report
                  <Download className="w-5 h-5" />
                </div>
              )}
            </Button>

            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-purple-200 shadow-inner">
              <h4 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                📊 What You'll Get:
              </h4>
              <ul className="text-sm text-purple-800 space-y-2">
                <li className="flex items-center gap-2">✨ <strong>Stunning animated gradient HTML report</strong></li>
                <li className="flex items-center gap-2">📈 <strong>Interactive Google Charts</strong> for attendance trends</li>
                <li className="flex items-center gap-2">👥 <strong>Student-wise performance</strong> analysis with rankings</li>
                <li className="flex items-center gap-2">🏆 <strong>Top performers</strong> showcase with animations</li>
                <li className="flex items-center gap-2">⚠️ <strong>At-risk students</strong> identification (below 75%)</li>
                <li className="flex items-center gap-2">📊 <strong>Comprehensive statistics</strong> and insights</li>
                <li className="flex items-center gap-2">🎨 <strong>Professional design</strong> ready to share</li>
              </ul>
              <div className="mt-3 p-3 bg-yellow-100 rounded-md border border-yellow-300">
                <p className="text-xs text-yellow-900 font-semibold">📄 Supports PDF (with OCR), CSV, and Excel files!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}