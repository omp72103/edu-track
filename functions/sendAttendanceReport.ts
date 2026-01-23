import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import nodemailer from 'npm:nodemailer@6.9.7';
import ExcelJS from 'npm:exceljs@4.4.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Fetch session details
    const session = await base44.asServiceRole.entities.Session.get(session_id);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch batch details
    const batches = await base44.asServiceRole.entities.Batch.filter({ batch_id: session.batch_id });
    const batch = batches.length > 0 ? batches[0] : null;

    // Fetch students in batch
    const students = await base44.asServiceRole.entities.Student.filter({ batch_id: session.batch_id });
    
    // Fetch attendance records for this session
    const attendanceRecords = await base44.asServiceRole.entities.AttendanceRecord.filter({ session_id });

    // Generate Excel report
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Title Section
    const title = `EDU TRACK - Attendance Report`;
    const subtitle = `${session.college_name} - ${session.year}`;
    const sessionInfo = `Session: ${session.session_name} | Date: ${new Date(session.session_date).toLocaleDateString()}`;

    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = subtitle;
    worksheet.getCell('A2').font = { name: 'Calibri', size: 12, bold: true };
    worksheet.getCell('A2').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' }
    };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 25;

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = sessionInfo;
    worksheet.getCell('A3').font = { name: 'Calibri', size: 10, italic: true };
    worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).height = 20;

    worksheet.addRow([]);

    // Header Row
    const headerRow = ['Roll No.', 'PRN', 'Student Name', 'Status', 'Marked At', 'Marked By'];
    const excelHeaderRow = worksheet.addRow(headerRow);
    excelHeaderRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    excelHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };
    excelHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    excelHeaderRow.height = 25;

    worksheet.getColumn(1).width = 12;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 30;

    // Data rows
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student_id] = record;
    });

    const sortedStudents = students.sort((a, b) => (parseInt(a.roll_no) || 0) - (parseInt(b.roll_no) || 0));
    
    sortedStudents.forEach((student, index) => {
      const attendance = attendanceMap[student.id];
      const isPresent = attendance?.is_present || false;

      const row = [
        student.roll_no || (index + 1).toString(),
        student.prn || '',
        student.name || '',
        isPresent ? 'Present' : 'Absent',
        attendance?.marked_at ? new Date(attendance.marked_at).toLocaleString() : '',
        attendance?.marked_by || ''
      ];

      const dataRow = worksheet.addRow(row);
      dataRow.font = { name: 'Calibri', size: 10 };
      dataRow.alignment = { vertical: 'middle', horizontal: 'left' };

      // Color coding for status
      const statusCell = dataRow.getCell(4);
      if (isPresent) {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF10B981' } // Green
        };
        statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      } else {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEF4444' } // Red
        };
        statusCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      }
      statusCell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Add borders
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Summary
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([
      'Summary:',
      `Total: ${students.length}`,
      `Present: ${session.present_count || 0}`,
      `Absent: ${students.length - (session.present_count || 0)}`,
      `Attendance: ${students.length > 0 ? Math.round((session.present_count || 0) / students.length * 100) : 0}%`
    ]);
    summaryRow.font = { name: 'Calibri', size: 11, bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }
    };

    const footerRow = worksheet.addRow(['Generated by EDU TRACK Education Management System']);
    worksheet.mergeCells(footerRow.number, 1, footerRow.number, 6);
    footerRow.getCell(1).font = { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF6B7280' } };
    footerRow.getCell(1).alignment = { horizontal: 'center' };

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    const tempFilePath = `/tmp/attendance_${session_id}_${Date.now()}.xlsx`;
    await Deno.writeFile(tempFilePath, new Uint8Array(buffer));

    // Setup NodeMailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: Deno.env.get('EMAIL_USER'),
        pass: Deno.env.get('EMAIL_PASS')
      }
    });

    // Prepare email recipients
    const recipients = [];
    if (session.tpo_email) recipients.push(session.tpo_email);
    if (session.faculty_email) recipients.push(session.faculty_email);
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail) recipients.push(adminEmail);

    if (recipients.length === 0) {
      return Response.json({ 
        error: 'No recipients configured. Please set TPO email or Admin email.' 
      }, { status: 400 });
    }

    // Email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); flex: 1; margin: 0 10px; }
          .stat-box h3 { margin: 0; color: #667eea; font-size: 32px; }
          .stat-box p { margin: 5px 0 0 0; color: #6b7280; font-size: 14px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin-top: 20px; }
          .details table { width: 100%; border-collapse: collapse; }
          .details th { text-align: left; padding: 10px; background: #f3f4f6; border-bottom: 2px solid #e5e7eb; }
          .details td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Attendance Report Generated</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">EDU TRACK Education Management System</p>
          </div>
          <div class="content">
            <h2>Session Details</h2>
            <div class="details">
              <table>
                <tr><th>Session Name</th><td>${session.session_name}</td></tr>
                <tr><th>Date</th><td>${new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                <tr><th>Time</th><td>${session.session_time}</td></tr>
                <tr><th>Topic</th><td>${session.topic_taught}</td></tr>
                <tr><th>Faculty</th><td>${session.faculty_name}</td></tr>
                <tr><th>College</th><td>${session.college_name}</td></tr>
                <tr><th>Year</th><td>${session.year}</td></tr>
              </table>
            </div>

            <h2 style="margin-top: 30px;">Attendance Summary</h2>
            <div class="stats">
              <div class="stat-box">
                <h3>${students.length}</h3>
                <p>Total Students</p>
              </div>
              <div class="stat-box">
                <h3 style="color: #10b981;">${session.present_count || 0}</h3>
                <p>Present</p>
              </div>
              <div class="stat-box">
                <h3 style="color: #ef4444;">${students.length - (session.present_count || 0)}</h3>
                <p>Absent</p>
              </div>
              <div class="stat-box">
                <h3 style="color: #8b5cf6;">${students.length > 0 ? Math.round((session.present_count || 0) / students.length * 100) : 0}%</h3>
                <p>Attendance Rate</p>
              </div>
            </div>

            <p style="margin-top: 30px; padding: 15px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px;">
              <strong>📎 Attachment:</strong> Detailed attendance report is attached as an Excel file with color-coded attendance status (Green = Present, Red = Absent).
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from EDU TRACK Education Management System.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: `"EDU TRACK System" <${Deno.env.get('EMAIL_USER')}>`,
      to: recipients.join(', '),
      subject: `📊 Attendance Report - ${session.session_name} | ${new Date(session.session_date).toLocaleDateString()}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Attendance_${session.college_name}_${session.year}_${new Date(session.session_date).toISOString().split('T')[0]}.xlsx`.replace(/\s+/g, '_'),
          path: tempFilePath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);

    // Clean up temp file
    try {
      await Deno.remove(tempFilePath);
    } catch (e) {
      console.warn('Failed to remove temp file:', e);
    }

    // Log email delivery
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      recipients: recipients,
      session: session.session_name,
      timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Attendance report sent successfully',
      recipients: recipients,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending attendance report:', error);
    return Response.json({ 
      error: 'Failed to send attendance report', 
      details: error.message 
    }, { status: 500 });
  }
});