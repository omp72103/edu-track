import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Session, AttendanceRecord, User } from "@/entities/all";

export default function UploadAttendanceModal({ isOpen, onClose, onSuccess, batch, students }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv') || 
                 file.type === 'application/vnd.ms-excel' || file.name.endsWith('.xlsx') ||
                 file.type === 'application/pdf' || file.name.endsWith('.pdf') ||
                 file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'))) {
      setSelectedFile(file);
      setMessage(null);
    } else {
      setMessage({ type: "error", text: "Please select a valid CSV, Excel, PDF, or HTML file" });
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
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
    
    let headerRowIndex = 0;
    let headers = [];
    
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const lineUpper = lines[i].toUpperCase();
      if ((lineUpper.includes('PRN') || lineUpper.includes('ROLL')) && 
          (lineUpper.includes('NAME') || lineUpper.includes('STUDENT'))) {
        headerRowIndex = i;
        headers = parseLine(lines[i]);
        break;
      }
    }
    
    if (headers.length === 0) {
      headers = parseLine(lines[0]);
    }
    
    const data = [];
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length < 3 || !values.some(v => v && v.trim())) continue;
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      data.push(row);
    }
    
    return { headers, data };
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a file" });
      return;
    }

    setIsProcessing(true);
    setMessage({ type: "info", text: "🔄 Processing file..." });

    try {
      let headers, data;

      // Handle HTML files
      if (selectedFile.type === 'text/html' || selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(e.target.result, 'text/html');
            const tables = doc.querySelectorAll('table');
            let foundTable = null;
            
            for (const table of tables) {
              const headerRow = table.querySelector('tr');
              if (headerRow && headerRow.textContent.match(/PRN|Student|Roll|Name/i)) {
                foundTable = table;
                break;
              }
            }
            
            if (!foundTable) throw new Error("Could not find attendance table in HTML file");
            
            const rows = Array.from(foundTable.querySelectorAll('tr'));
            headers = Array.from(rows[0].querySelectorAll('th, td')).map(cell => cell.textContent.trim());
            
            data = rows.slice(1).map(row => {
              const cells = Array.from(row.querySelectorAll('td'));
              const rowData = {};
              headers.forEach((header, index) => {
                if (cells[index]) rowData[header] = cells[index].textContent.trim();
              });
              return rowData;
            }).filter(row => Object.values(row).some(val => val && val.length > 0));
            
            resolve();
          };
          reader.readAsText(selectedFile);
        });
      }
      // Handle PDF files
      else if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        setMessage({ type: "info", text: "📄 Uploading PDF..." });
        const { file_url } = await UploadFile({ file: selectedFile });
        
        setMessage({ type: "info", text: "🔍 Extracting attendance data..." });
        
        const ocrSchema = {
          type: "object",
          properties: {
            headers: {
              type: "array",
              description: "Extract ALL column headers including PRN, Student Name, and all date columns",
              items: { type: "string" }
            },
            students: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prn: { type: "string" },
                  name: { type: "string" },
                  attendance_data: { type: "array", items: { type: "string" } }
                },
                required: ["prn", "attendance_data"]
              }
            }
          },
          required: ["headers", "students"]
        };
        
        const ocrResult = await ExtractDataFromUploadedFile({ file_url, json_schema: ocrSchema });
        
        if (ocrResult.status !== "success" || !ocrResult.output?.students || !ocrResult.output?.headers) {
          throw new Error("Failed to extract data from PDF");
        }
        
        headers = ocrResult.output.headers;
        const extractedStudents = ocrResult.output.students;
        
        const dateColumns = headers.filter(h => {
          const upper = h.toUpperCase();
          return !['PRN', 'NAME', 'STUDENT', 'ROLL', 'SL', 'SR'].some(meta => upper.includes(meta));
        });
        
        data = extractedStudents.map(student => {
          const row = { 'PRN': student.prn, 'STUDENT NAME': student.name };
          dateColumns.forEach((dateCol, idx) => {
            row[dateCol] = student.attendance_data[idx] || '';
          });
          return row;
        });
      }
      // Handle CSV files
      else {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = (e) => {
            const parsed = parseCSV(e.target.result);
            headers = parsed.headers;
            data = parsed.data;
            resolve();
          };
          reader.readAsText(selectedFile);
        });
      }

      if (!data || data.length === 0) {
        throw new Error("No data found in file");
      }

      setMessage({ type: "info", text: "📊 Analyzing attendance data..." });

      // Identify PRN column
      const prnColumn = headers.find(h => h.toUpperCase().includes('PRN')) || headers[1];
      
      // Identify date columns (anything that's not metadata)
      const metadataKeywords = ['SL NO', 'ROLL', 'PRN', 'NAME', 'STUDENT', 'SR'];
      const dateColumns = headers.filter(h => {
        const upper = h.toUpperCase().trim();
        return h.trim() && !metadataKeywords.some(meta => upper.includes(meta));
      });

      console.log('📅 Found date columns:', dateColumns);

      // Match students by PRN
      const studentMap = {};
      students.forEach(student => {
        if (student.prn) studentMap[student.prn.trim().toUpperCase()] = student;
      });

      // Process attendance data
      const user = await User.me();
      const sessionsCreated = [];
      const recordsCreated = [];
      let matchedStudents = 0;

      for (const dateCol of dateColumns) {
        // Create session for this date/shift
        const sessionData = {
          session_name: `Uploaded: ${dateCol}`,
          topic_taught: `Attendance for ${dateCol}`,
          faculty_name: user.full_name,
          faculty_email: user.email,
          session_date: new Date().toISOString().split('T')[0],
          session_time: "Uploaded",
          duration: "As per schedule",
          status: "completed",
          batch_id: batch.batch_id,
          college_name: batch.college_name,
          year: batch.year,
          branch: batch.branch,
          division: batch.division,
          batch_description: batch.batch_description,
          total_students: students.length
        };

        const session = await Session.create(sessionData);
        sessionsCreated.push(session);

        // Create attendance records in batches to avoid rate limits
        let presentCount = 0;
        const recordsToCreate = [];

        for (const row of data) {
          const prn = row[prnColumn]?.toString().trim().toUpperCase();
          if (!prn) continue;

          const student = studentMap[prn];
          if (!student) continue;

          matchedStudents++;

          const attendanceValue = row[dateCol]?.toString().trim().toUpperCase();
          const isPresent = ['P', 'PRESENT', '✓', '✔', 'Y', 'YES', '1'].includes(attendanceValue);

          if (isPresent) presentCount++;

          recordsToCreate.push({
            student_id: student.id,
            session_id: session.id,
            batch_id: batch.batch_id,
            is_present: isPresent,
            marked_at: new Date().toISOString(),
            marked_by: user.email
          });
        }

        // Batch create with delays to avoid rate limits
        const batchSize = 20;
        for (let i = 0; i < recordsToCreate.length; i += batchSize) {
          const batch = recordsToCreate.slice(i, i + batchSize);
          const created = await AttendanceRecord.bulkCreate(batch);
          recordsCreated.push(...created);

          // Add delay between batches to avoid rate limits
          if (i + batchSize < recordsToCreate.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Update session present count
        await Session.update(session.id, { present_count: presentCount });
      }

      setUploadStats({
        sessionsCreated: sessionsCreated.length,
        recordsCreated: recordsCreated.length,
        matchedStudents: new Set(recordsCreated.map(r => r.student_id)).size,
        totalStudents: students.length
      });

      setMessage({ 
        type: "success", 
        text: `✅ Successfully uploaded ${sessionsCreated.length} sessions with ${recordsCreated.length} attendance records!` 
      });

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ type: "error", text: `Error: ${error.message}` });
    }

    setIsProcessing(false);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setMessage(null);
    setUploadStats(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Upload Attendance File
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!uploadStats ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf,.html,.htm"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedFile ? selectedFile.name : "Select attendance file"}
                </h3>
                <p className="text-gray-600 text-sm">
                  CSV, Excel, PDF, or HTML with PRN and date columns
                </p>
                <Button className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </Button>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-800' : message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                  {message.text}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">📋 File Format Requirements:</h4>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>File must contain a <strong>PRN</strong> column</li>
                  <li>Date columns should be named with date or shift info (e.g., "08.12.2025 Morning")</li>
                  <li>Attendance marked as <strong>P</strong> (Present) or <strong>A</strong> (Absent)</li>
                  <li>Students matched by PRN number</li>
                  <li>Supports multiple shifts per day (Morning, Afternoon, Evening)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleUpload} disabled={!selectedFile || isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Attendance
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-4">Upload Successful!</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{uploadStats.sessionsCreated}</div>
                  <div className="text-sm text-blue-800">Sessions Created</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{uploadStats.recordsCreated}</div>
                  <div className="text-sm text-green-800">Records Created</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{uploadStats.matchedStudents}</div>
                  <div className="text-sm text-purple-800">Students Matched</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">{uploadStats.totalStudents}</div>
                  <div className="text-sm text-orange-800">Total Students</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}