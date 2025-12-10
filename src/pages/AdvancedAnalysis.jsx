import React, { useState, useRef } from "react";
import { College } from "@/entities/all";
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM } from "@/integrations/Core";
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
  const [reportConfig, setReportConfig] = useState({
    includeCharts: true,
    includeTopPerformers: true,
    includeAtRisk: true,
    includeStats: true,
    theme: 'gradient',
    notes: ''
  });
  const [showReportSettings, setShowReportSettings] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

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
    
    console.log('📄 Parsing CSV with', lines.length, 'lines');
    
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
    
    // Find the header row - look for row with SL NO, PRN, STUDENT NAME
    let headerRowIndex = 0;
    let headers = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const parsed = parseLine(lines[i]);
      const lineText = lines[i].toUpperCase();
      
      // Check if this line contains the key column names
      if ((lineText.includes('SL NO') || lineText.includes('ROLL NO')) && 
          lineText.includes('PRN') && 
          (lineText.includes('STUDENT NAME') || lineText.includes('NAME'))) {
        headerRowIndex = i;
        headers = parsed;
        console.log(`✅ Found header row at line ${i}:`, headers);
        break;
      }
    }
    
    if (headers.length === 0) {
      console.log('⚠️ No header row found, using first line as headers');
      headers = parseLine(lines[0]);
    }
    
    // Parse data rows starting after header
    const data = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      
      // Skip empty rows or rows with too few columns
      if (values.length < 3 || !values.some(v => v && v.trim())) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Only include rows that have a student name
      const hasName = row[headers[0]] || row[headers[1]] || row[headers[2]];
      if (hasName && hasName.trim().length > 1) {
        data.push(row);
      }
    }
    
    console.log('✅ Parsed CSV:', { headers: headers.length, dataRows: data.length });
    console.log('📊 Sample header:', headers.slice(0, 5));
    console.log('📊 Sample row:', data[0]);
    
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
      sampleRow: data[0],
      allRowKeys: data[0] ? Object.keys(data[0]) : []
    });
    
    // Extract date columns - look for any column that's NOT metadata columns
    const metadataColumns = ['SL NO', 'PRN', 'STUDENT NAME'];
    const dateColumns = headers.filter(h => {
      // Skip empty headers
      if (!h || h.trim() === '') {
        return false;
      }
      
      const upper = h.toUpperCase().trim();
      
      // Check if this is a metadata column
      const isMetadata = metadataColumns.some(meta => upper === meta || upper.includes(meta));
      if (isMetadata) {
        return false;
      }
      
      // Check if this column has attendance data
      let pCount = 0;
      let aCount = 0;
      let sampleValues = [];
      
      data.forEach((row, idx) => {
        const val = row[h];
        if (idx < 3) sampleValues.push(val); // Collect first 3 values for debugging
        
        if (val !== undefined && val !== null && val !== '') {
          const valStr = val.toString().trim().toUpperCase();
          if (valStr === 'P' || valStr === 'PRESENT' || valStr === '✓' || valStr === 'Y') pCount++;
          if (valStr === 'A' || valStr === 'ABSENT' || valStr === 'X' || valStr === 'N' || valStr === '-') aCount++;
        }
      });
      
      const hasData = pCount > 0 || aCount > 0;
      if (!hasData && h.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/)) {
        console.log(`⚠️ Date-like column "${h}" has no P/A values. Sample values:`, sampleValues);
      }
      
      return hasData;
    });

    console.log('📅 Detected date columns:', dateColumns.length, dateColumns.slice(0, 5));

    const students = data.map(row => ({
      name: row['STUDENT NAME'] || row['Student Name'] || row['Name'] || row['NAME'] || row['name'] || '',
      rollNo: row['SL NO'] || row['SL NO.'] || row['Roll No.'] || row['Roll No'] || row['ROLL NO'] || row['Serial No'] || '',
      prn: row['PRN'] || row['prn'] || ''
    })).filter(s => s.name && s.name.trim().length > 0);

    console.log('👥 Detected students:', students.length);
    
    if (dateColumns.length === 0) {
      console.error('❌ No date columns detected!', { 
        headers,
        firstRowKeys: data[0] ? Object.keys(data[0]) : [],
        sampleData: data.slice(0, 2)
      });
      throw new Error('No attendance data detected. Please ensure your file has attendance marked as P/A or Present/Absent in date columns.');
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

  const exportToCSV = (analysis, batchInfo) => {
    const { attendanceByDate, studentAttendance } = analysis;
    
    const csvRows = [];
    csvRows.push([`Attendance Report - ${batchInfo.college_name}`]);
    csvRows.push([`Branch: ${batchInfo.branch}`, `Year: ${batchInfo.year}`, `Division: ${batchInfo.division || 'All'}`]);
    csvRows.push([]);
    
    // Student attendance data
    csvRows.push(['Roll No', 'PRN', 'Student Name', 'Present', 'Total', 'Percentage']);
    studentAttendance.forEach(s => {
      csvRows.push([s.rollNo, s.prn, s.name, s.present, s.total, `${s.percentage}%`]);
    });
    
    csvRows.push([]);
    csvRows.push(['Session-wise Attendance']);
    csvRows.push(['Date', 'Present', 'Total', 'Percentage']);
    attendanceByDate.forEach(d => {
      csvRows.push([d.date, d.present, d.total, `${d.percentage}%`]);
    });
    
    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Report_${batchInfo.college_name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getThemeColors = (theme) => {
    const themes = {
      gradient: {
        bg: 'linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #4facfe)',
        card: 'rgba(255,255,255,0.95)',
        primary: '#667eea',
        secondary: '#764ba2'
      },
      ocean: {
        bg: 'linear-gradient(-45deg, #2193b0, #6dd5ed, #00c6ff, #0072ff)',
        card: 'rgba(255,255,255,0.95)',
        primary: '#2193b0',
        secondary: '#0072ff'
      },
      sunset: {
        bg: 'linear-gradient(-45deg, #f12711, #f5af19, #ff6b6b, #ee5a6f)',
        card: 'rgba(255,255,255,0.95)',
        primary: '#f12711',
        secondary: '#f5af19'
      },
      forest: {
        bg: 'linear-gradient(-45deg, #134e5e, #71b280, #56ab2f, #a8e063)',
        card: 'rgba(255,255,255,0.95)',
        primary: '#134e5e',
        secondary: '#56ab2f'
      }
    };
    return themes[theme] || themes.gradient;
  };

  const generateHTMLReport = (analysis, batchInfo, config) => {
    const { attendanceByDate, studentAttendance, totalSessions } = analysis;
    const theme = getThemeColors(config.theme);
    
    const overallAttendance = attendanceByDate.length > 0 
      ? (attendanceByDate.reduce((sum, d) => sum + parseFloat(d.percentage), 0) / attendanceByDate.length).toFixed(1)
      : 0;

    const topPerformers = studentAttendance.slice(0, 10);
    const needsAttention = studentAttendance.filter(s => parseFloat(s.percentage) < 75).slice(0, 10);
    const excellent = studentAttendance.filter(s => parseFloat(s.percentage) >= 90).length;
    const good = studentAttendance.filter(s => parseFloat(s.percentage) >= 75 && parseFloat(s.percentage) < 90).length;
    const average = studentAttendance.filter(s => parseFloat(s.percentage) >= 60 && parseFloat(s.percentage) < 75).length;
    const poor = studentAttendance.filter(s => parseFloat(s.percentage) < 60).length;

    const chartData = attendanceByDate.map(d => `['${d.date.replace(/'/g, "\\'")}', ${parseFloat(d.percentage)}]`).join(',');
    const studentChartData = studentAttendance.slice(0, 20).map(s => 
      `['${s.name.substring(0, 20).replace(/'/g, "\\'")}', ${parseFloat(s.percentage)}]`
    ).join(',');
    const pieChartData = `['Excellent (≥90%)', ${excellent}], ['Good (75-89%)', ${good}], ['Average (60-74%)', ${average}], ['Poor (<60%)', ${poor}]`;
    
    // Distribution by attendance range
    const attendanceRanges = [
      { range: '90-100%', count: studentAttendance.filter(s => parseFloat(s.percentage) >= 90).length },
      { range: '80-89%', count: studentAttendance.filter(s => parseFloat(s.percentage) >= 80 && parseFloat(s.percentage) < 90).length },
      { range: '70-79%', count: studentAttendance.filter(s => parseFloat(s.percentage) >= 70 && parseFloat(s.percentage) < 80).length },
      { range: '60-69%', count: studentAttendance.filter(s => parseFloat(s.percentage) >= 60 && parseFloat(s.percentage) < 70).length },
      { range: '<60%', count: studentAttendance.filter(s => parseFloat(s.percentage) < 60).length }
    ];
    const distributionChartData = attendanceRanges.map(r => `['${r.range}', ${r.count}]`).join(',');

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
            background: ${theme.bg};
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
            background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 50%, ${theme.primary} 100%);
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

            ${config.aiInsights ? `
            <div class="chart-container" style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);">
                <h2 class="chart-title">🤖 AI-Generated Insights & Recommendations</h2>
                <div style="white-space: pre-wrap; line-height: 1.8; color: #333; font-size: 15px;">${config.aiInsights}</div>
            </div>
            ` : ''}

            <div class="chart-container" style="background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,140,0,0.1) 100%);">
                <h2 class="chart-title">📊 Batch Attendance Summary</h2>
                <div style="line-height: 1.8; color: #333;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
                        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="font-size: 14px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Overall Performance</div>
                            <div style="font-size: 32px; font-weight: bold; color: ${theme.primary};">${overallAttendance}%</div>
                            <div style="font-size: 12px; color: #888; margin-top: 5px;">Average attendance rate</div>
                        </div>
                        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="font-size: 14px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Total Students</div>
                            <div style="font-size: 32px; font-weight: bold; color: ${theme.secondary};">${studentAttendance.length}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 5px;">Active in batch</div>
                        </div>
                        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="font-size: 14px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Sessions Analyzed</div>
                            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${totalSessions}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 5px;">Classes tracked</div>
                        </div>
                        <div style="padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="font-size: 14px; color: #666; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Risk Students</div>
                            <div style="font-size: 32px; font-weight: bold; color: #ef4444;">${needsAttention.length}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 5px;">Below 75% attendance</div>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        <h3 style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px;">📈 Performance Distribution</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                            <div style="padding: 15px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; color: white;">
                                <div style="font-size: 28px; font-weight: bold;">${excellent}</div>
                                <div style="font-size: 13px; opacity: 0.9;">Excellent (≥90%)</div>
                            </div>
                            <div style="padding: 15px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 10px; color: white;">
                                <div style="font-size: 28px; font-weight: bold;">${good}</div>
                                <div style="font-size: 13px; opacity: 0.9;">Good (75-89%)</div>
                            </div>
                            <div style="padding: 15px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; color: white;">
                                <div style="font-size: 28px; font-weight: bold;">${average}</div>
                                <div style="font-size: 13px; opacity: 0.9;">Average (60-74%)</div>
                            </div>
                            <div style="padding: 15px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; color: white;">
                                <div style="font-size: 28px; font-weight: bold;">${poor}</div>
                                <div style="font-size: 13px; opacity: 0.9;">Poor (<60%)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${config.notes ? `
            <div class="chart-container">
                <h2 class="chart-title">📝 Custom Notes & Observations</h2>
                <div style="white-space: pre-wrap; line-height: 1.6; color: #333;">${config.notes}</div>
            </div>
            ` : ''}

            ${config.includeStats ? `
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
            ` : ''}

            ${config.includeCharts ? `
            <div class="chart-container">
                <h2 class="chart-title">📊 Attendance Trend Over Time (Line Chart)</h2>
                <div id="line_chart" style="width: 100%; height: 400px;"></div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div class="chart-container">
                    <h2 class="chart-title">📊 Performance Distribution (Pie Chart)</h2>
                    <div id="pie_chart" style="width: 100%; height: 400px;"></div>
                </div>
                <div class="chart-container">
                    <h2 class="chart-title">📊 Attendance Range Distribution</h2>
                    <div id="distribution_chart" style="width: 100%; height: 400px;"></div>
                </div>
            </div>

            <div class="chart-container">
                <h2 class="chart-title">📊 Student-wise Performance (Bar Chart - Top 20)</h2>
                <div id="bar_chart" style="width: 100%; height: 500px;"></div>
            </div>

            <div class="chart-container">
                <h2 class="chart-title">📊 Session-wise Attendance Comparison (Area Chart)</h2>
                <div id="area_chart" style="width: 100%; height: 400px;"></div>
            </div>
            ` : ''}

            ${config.includeTopPerformers ? `
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
            ` : ''}

            ${config.includeAtRisk && needsAttention.length > 0 ? `
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
                colors: ['${theme.primary}'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Attendance %',
                    minValue: 0,
                    maxValue: 100,
                    gridlines: { color: '#f0f0f0' }
                },
                hAxis: { 
                    title: 'Session Date',
                    slantedText: true,
                    slantedTextAngle: 45
                },
                pointSize: 5,
                lineWidth: 3
            };

            var lineChart = new google.visualization.LineChart(document.getElementById('line_chart'));
            lineChart.draw(lineData, lineOptions);

            // Pie Chart
            var pieData = google.visualization.arrayToDataTable([
                ['Category', 'Students'],
                ${pieChartData}
            ]);

            var pieOptions = {
                title: 'Student Performance Categories',
                colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                pieHole: 0.4,
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                pieSliceText: 'value',
                legend: { position: 'bottom' }
            };

            var pieChart = new google.visualization.PieChart(document.getElementById('pie_chart'));
            pieChart.draw(pieData, pieOptions);

            // Distribution Chart
            var distData = google.visualization.arrayToDataTable([
                ['Range', 'Students'],
                ${distributionChartData}
            ]);

            var distOptions = {
                title: 'Students by Attendance Range',
                colors: ['${theme.secondary}'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Number of Students',
                    gridlines: { color: '#f0f0f0' }
                },
                hAxis: { 
                    title: 'Attendance Range'
                },
                legend: { position: 'none' }
            };

            var distChart = new google.visualization.ColumnChart(document.getElementById('distribution_chart'));
            distChart.draw(distData, distOptions);

            // Bar Chart
            var barData = google.visualization.arrayToDataTable([
                ['Student', 'Attendance %'],
                ${studentChartData}
            ]);

            var barOptions = {
                title: 'Top 20 Students by Attendance',
                legend: { position: 'none' },
                colors: ['${theme.primary}'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Attendance %',
                    minValue: 0,
                    maxValue: 100,
                    gridlines: { color: '#f0f0f0' }
                },
                hAxis: { 
                    title: 'Student Name',
                    slantedText: true,
                    slantedTextAngle: 45
                }
            };

            var barChart = new google.visualization.ColumnChart(document.getElementById('bar_chart'));
            barChart.draw(barData, barOptions);

            // Area Chart
            var areaData = google.visualization.arrayToDataTable([
                ['Date', 'Attendance %'],
                ${chartData}
            ]);

            var areaOptions = {
                title: 'Attendance Trend (Area View)',
                legend: { position: 'bottom' },
                colors: ['${theme.secondary}'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                vAxis: { 
                    title: 'Attendance %',
                    minValue: 0,
                    maxValue: 100,
                    gridlines: { color: '#f0f0f0' }
                },
                hAxis: { 
                    title: 'Session Date',
                    slantedText: true,
                    slantedTextAngle: 45
                },
                areaOpacity: 0.4
            };

            var areaChart = new google.visualization.AreaChart(document.getElementById('area_chart'));
            areaChart.draw(areaData, areaOptions);
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

      // Generate AI insights
      setMessage({ type: "info", text: "🤖 Generating AI insights and recommendations..." });

      try {
        const insightsPrompt = `Analyze this attendance data and provide detailed insights and recommendations:

      Batch: ${formData.college_name} - ${formData.branch} (${formData.year})
      Total Students: ${studentAttendance.length}
      Total Sessions: ${analysis.totalSessions}
      Overall Attendance: ${(attendanceByDate.reduce((sum, d) => sum + parseFloat(d.percentage), 0) / attendanceByDate.length).toFixed(1)}%

      Performance Distribution:
      - Excellent (≥90%): ${studentAttendance.filter(s => parseFloat(s.percentage) >= 90).length} students
      - Good (75-89%): ${studentAttendance.filter(s => parseFloat(s.percentage) >= 75 && parseFloat(s.percentage) < 90).length} students
      - Average (60-74%): ${studentAttendance.filter(s => parseFloat(s.percentage) >= 60 && parseFloat(s.percentage) < 75).length} students
      - Poor (<60%): ${studentAttendance.filter(s => parseFloat(s.percentage) < 60).length} students

      Top 3 Performers: ${studentAttendance.slice(0, 3).map(s => `${s.name} (${s.percentage}%)`).join(', ')}
      Students Below 75%: ${studentAttendance.filter(s => parseFloat(s.percentage) < 75).length}

      Provide:
      1. Overall batch performance analysis
      2. Key trends and patterns observed
      3. Areas of concern
      4. Specific actionable recommendations for improvement
      5. Recognition suggestions for top performers

      Format your response in a clear, professional manner suitable for an educational report.`;

        const aiResponse = await InvokeLLM({
          prompt: insightsPrompt,
          add_context_from_internet: false
        });

        setReportConfig(prev => ({ ...prev, aiInsights: aiResponse }));
      } catch (error) {
        console.error("Failed to generate AI insights:", error);
      }

      // Store analysis data for export options
      setAnalysisData(analysis);
      setShowReportSettings(true);
      setMessage({ 
        type: "success", 
        text: `✅ Analysis complete! AI insights generated. Configure your report settings.` 
      });
      setIsProcessing(false);
    } catch (error) {
      console.error("Analysis error:", error);
      setMessage({ type: "error", text: `Error analyzing file: ${error.message}` });
      setIsProcessing(false);
    }
    };

    const handleExportHTML = () => {
    if (!analysisData) return;

    const htmlReport = generateHTMLReport(analysisData, formData, reportConfig);
    const blob = new Blob([htmlReport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Analysis_${formData.college_name.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({ type: "success", text: "HTML report downloaded!" });
    };

    const handleExportCSV = () => {
    if (!analysisData) return;
    exportToCSV(analysisData, formData);
    setMessage({ type: "success", text: "CSV report downloaded!" });
    };

    const handleNewAnalysis = () => {
    setAnalysisData(null);
    setShowReportSettings(false);
    setSelectedFile(null);
    setMessage(null);
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

            {showReportSettings && analysisData && (
            <Card className="shadow-xl border-2 border-green-100 mt-6">
            <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                Customize & Export Report
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Report Content</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.includeStats}
                        onChange={(e) => setReportConfig({...reportConfig, includeStats: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span>Include Statistics Cards</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.includeCharts}
                        onChange={(e) => setReportConfig({...reportConfig, includeCharts: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span>Include Charts & Graphs</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.includeTopPerformers}
                        onChange={(e) => setReportConfig({...reportConfig, includeTopPerformers: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span>Include Top Performers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfig.includeAtRisk}
                        onChange={(e) => setReportConfig({...reportConfig, includeAtRisk: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span>Include At-Risk Students</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Theme</h3>
                  <Select value={reportConfig.theme} onValueChange={(value) => setReportConfig({...reportConfig, theme: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Gradient (Purple-Blue)</SelectItem>
                      <SelectItem value="ocean">Ocean (Blue)</SelectItem>
                      <SelectItem value="sunset">Sunset (Red-Orange)</SelectItem>
                      <SelectItem value="forest">Forest (Green)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Custom Notes / Summary (Optional)</Label>
                <textarea
                  placeholder="Add any custom notes, observations, or summary for this report..."
                  value={reportConfig.notes}
                  onChange={(e) => setReportConfig({...reportConfig, notes: e.target.value})}
                  className="w-full h-32 p-3 border rounded-lg resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleExportHTML}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as HTML
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as CSV
                </Button>
                <Button
                  onClick={handleNewAnalysis}
                  variant="outline"
                >
                  New Analysis
                </Button>
              </div>
            </CardContent>
            </Card>
            )}
            </div>
            </div>
            );
            }