import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_type } = await req.json();

    // Fetch file content
    const fileResponse = await fetch(file_url);
    
    if (!fileResponse.ok) {
      return Response.json({ 
        success: false, 
        error: 'Failed to fetch file',
        students: []
      }, { status: 400 });
    }

    let parsedData = [];

    // CSV Parsing
    if (file_type === 'csv' || file_url.endsWith('.csv')) {
      const csvText = await fileResponse.text();
      parsedData = parseCSV(csvText);
    }
    
    // Excel Parsing (delegate to ExtractDataFromUploadedFile with smart schema)
    else if (file_type === 'excel' || file_url.match(/\.(xlsx?|xls)$/i)) {
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: getAttendanceSchema()
      });
      
      if (extractResult.status === 'success' && extractResult.output) {
        parsedData = normalizeExtractedData(extractResult.output);
      }
    }
    
    // PDF Parsing
    else if (file_type === 'pdf' || file_url.endsWith('.pdf')) {
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: getAttendanceSchema()
      });
      
      if (extractResult.status === 'success' && extractResult.output) {
        parsedData = normalizeExtractedData(extractResult.output);
      }
    }

    // Validate parsed data
    const validStudents = parsedData.filter(s => 
      s.roll_no && s.name && (s.attendance_records || s.attendance_percentage !== undefined)
    );

    return Response.json({
      success: true,
      students: validStudents,
      count: validStudents.length,
      detected_columns: parsedData.length > 0 ? Object.keys(parsedData[0]) : []
    });

  } catch (error) {
    console.error('Parse error:', error);
    return Response.json({ 
      success: false, 
      error: error.message,
      students: []
    }, { status: 500 });
  }
});

// CSV Parser with dynamic column detection
function parseCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Find header row (look for "Roll" or "Name" keywords)
  let headerIndex = -1;
  let headers = [];
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const row = lines[i].split(',').map(c => c.trim().toLowerCase());
    if (row.some(col => /roll|student.*name|name/i.test(col))) {
      headerIndex = i;
      headers = lines[i].split(',').map(c => c.trim());
      break;
    }
  }

  if (headerIndex === -1) {
    // Assume first row is header
    headerIndex = 0;
    headers = lines[0].split(',').map(c => c.trim());
  }

  // Identify column mappings
  const rollIndex = headers.findIndex(h => /roll.*no|roll.*number|roll/i.test(h));
  const nameIndex = headers.findIndex(h => /student.*name|name/i.test(h));
  const prnIndex = headers.findIndex(h => /prn|registration/i.test(h));
  
  // Find date columns (session dates)
  const dateColumns = [];
  headers.forEach((h, idx) => {
    if (idx > nameIndex && /\d{1,2}[\/\-]\d{1,2}|\d{4}|session|date/i.test(h)) {
      dateColumns.push({ index: idx, date: h });
    }
  });

  const students = [];
  
  // Parse student rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('Total') || line.startsWith('Average')) continue;
    
    const cells = parseCSVLine(line);
    if (cells.length < 2) continue;

    const rollNo = cells[rollIndex]?.trim();
    const name = cells[nameIndex]?.trim();
    
    if (!rollNo || !name || name.length < 2) continue;

    // Parse attendance marks
    const attendanceRecords = [];
    let presentCount = 0;
    let totalSessions = 0;

    dateColumns.forEach(({ index, date }) => {
      if (cells[index]) {
        const mark = cells[index].trim().toUpperCase();
        if (mark === 'P' || mark === 'PRESENT') {
          attendanceRecords.push({ date, status: 'present' });
          presentCount++;
          totalSessions++;
        } else if (mark === 'A' || mark === 'ABSENT') {
          attendanceRecords.push({ date, status: 'absent' });
          totalSessions++;
        } else if (mark !== 'N/A' && mark !== '' && mark !== '-') {
          // Treat any other mark as present
          attendanceRecords.push({ date, status: 'present' });
          presentCount++;
          totalSessions++;
        }
      }
    });

    const attendancePercentage = totalSessions > 0 
      ? parseFloat(((presentCount / totalSessions) * 100).toFixed(2))
      : 0;

    students.push({
      roll_no: rollNo,
      name: name.toUpperCase(),
      prn: cells[prnIndex]?.trim() || '',
      attendance_records: attendanceRecords,
      present_count: presentCount,
      total_sessions: totalSessions,
      attendance_percentage: attendancePercentage
    });
  }

  return students;
}

// Helper to parse CSV line with quoted fields
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  
  return cells;
}

// Schema for AI extraction
function getAttendanceSchema() {
  return {
    type: "object",
    properties: {
      students: {
        type: "array",
        description: "Extract all student rows with attendance data, ignore header metadata rows",
        items: {
          type: "object",
          properties: {
            roll_no: {
              type: "string",
              description: "Roll number or student ID"
            },
            name: {
              type: "string",
              description: "Student full name"
            },
            prn: {
              type: "string",
              description: "PRN or registration number if available"
            },
            attendance_records: {
              type: "array",
              description: "List of session attendance marks",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  status: { 
                    type: "string",
                    description: "Convert P/Present to 'present', A/Absent to 'absent', skip N/A"
                  }
                }
              }
            },
            present_count: {
              type: "number",
              description: "Total present sessions"
            },
            total_sessions: {
              type: "number",
              description: "Total sessions conducted"
            },
            attendance_percentage: {
              type: "number",
              description: "Attendance percentage"
            }
          },
          required: ["roll_no", "name"]
        }
      }
    }
  };
}

// Normalize AI-extracted data
function normalizeExtractedData(output) {
  const students = output.students || [];
  
  return students.map(student => {
    // Calculate if not provided
    let presentCount = student.present_count || 0;
    let totalSessions = student.total_sessions || 0;
    
    if (student.attendance_records && student.attendance_records.length > 0) {
      presentCount = student.attendance_records.filter(r => 
        r.status === 'present' || r.status === 'P' || r.status === '1'
      ).length;
      totalSessions = student.attendance_records.length;
    }
    
    const attendancePercentage = totalSessions > 0
      ? parseFloat(((presentCount / totalSessions) * 100).toFixed(2))
      : student.attendance_percentage || 0;

    return {
      roll_no: student.roll_no?.toString().trim() || '',
      name: (student.name || '').toUpperCase().trim(),
      prn: student.prn?.toString().trim() || '',
      attendance_records: student.attendance_records || [],
      present_count: presentCount,
      total_sessions: totalSessions,
      attendance_percentage: attendancePercentage
    };
  }).filter(s => s.roll_no && s.name && s.name.length > 2);
}