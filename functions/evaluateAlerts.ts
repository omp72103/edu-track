import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // RULE 1: LOW ATTENDANCE ALERT (<75%)
    await checkLowAttendance(base44);

    // RULE 2: CONTINUOUS ABSENTEEISM (≥3 consecutive days)
    await checkContinuousAbsenteeism(base44);

    // RULE 3: LATE ASSIGNMENT SUBMISSIONS
    await checkLateSubmissions(base44);

    return Response.json({
      success: true,
      message: 'Alert evaluation completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Alert evaluation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// RULE 1: LOW ATTENDANCE ALERT
async function checkLowAttendance(base44) {
  const students = await base44.entities.Student.list();
  const sessions = await base44.entities.Session.list();
  const attendanceRecords = await base44.entities.AttendanceRecord.list();

  for (const student of students) {
    const studentSessions = sessions.filter(s => s.batch_id === student.batch_id);
    const totalSessions = studentSessions.length;

    if (totalSessions === 0) continue;

    const presentCount = attendanceRecords.filter(
      a => a.student_id === student.id && a.is_present
    ).length;

    const attendancePercentage = (presentCount / totalSessions) * 100;

    if (attendancePercentage < 75) {
      // Check cooldown - don't spam alerts
      const existingAlerts = await base44.entities.StudentNotification.filter({
        student_id: student.id,
        category: 'Alert',
        title: 'Low Attendance Warning'
      });

      const lastAlert = existingAlerts.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (lastAlert && (Date.now() - new Date(lastAlert.created_date).getTime()) < cooldownPeriod) {
        continue;
      }

      // Create alert
      await base44.entities.StudentNotification.create({
        student_id: student.id,
        batch_id: student.batch_id,
        college_name: student.college_name,
        year: student.year,
        category: 'Alert',
        title: 'Low Attendance Warning',
        message: `⚠️ Your attendance is ${attendancePercentage.toFixed(1)}%, which is below the minimum required threshold of 75%. Present: ${presentCount}/${totalSessions} sessions. Please improve your attendance to meet academic requirements.`,
        priority: 'High',
        is_read: false,
        created_by: 'System'
      });
    }
  }
}

// RULE 2: CONTINUOUS ABSENTEEISM
async function checkContinuousAbsenteeism(base44) {
  const students = await base44.entities.Student.list();
  const sessions = await base44.entities.Session.filter({}, '-session_date', 30);
  const attendanceRecords = await base44.entities.AttendanceRecord.list();

  for (const student of students) {
    const studentSessions = sessions
      .filter(s => s.batch_id === student.batch_id)
      .sort((a, b) => new Date(b.session_date) - new Date(a.session_date));

    let consecutiveAbsences = 0;
    const absentDates = [];

    for (const session of studentSessions) {
      const attended = attendanceRecords.find(
        a => a.student_id === student.id && a.session_id === session.id && a.is_present
      );

      if (!attended) {
        consecutiveAbsences++;
        absentDates.push(session.session_date);
      } else {
        break; // Reset on attendance
      }
    }

    if (consecutiveAbsences >= 3) {
      // Check cooldown
      const existingAlerts = await base44.entities.StudentNotification.filter({
        student_id: student.id,
        category: 'Alert',
        title: 'Critical: Continuous Absenteeism'
      });

      const lastAlert = existingAlerts.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      const cooldownPeriod = 3 * 24 * 60 * 60 * 1000; // 3 days
      if (lastAlert && (Date.now() - new Date(lastAlert.created_date).getTime()) < cooldownPeriod) {
        continue;
      }

      // Create critical alert
      await base44.entities.StudentNotification.create({
        student_id: student.id,
        batch_id: student.batch_id,
        college_name: student.college_name,
        year: student.year,
        category: 'Alert',
        title: 'Critical: Continuous Absenteeism',
        message: `🚨 URGENT: You have been absent for ${consecutiveAbsences} consecutive sessions. This requires immediate attention. Last ${absentDates.length} absences recorded. Please contact your faculty or admin immediately.`,
        priority: 'Urgent',
        is_read: false,
        created_by: 'System'
      });
    }
  }
}

// RULE 3: LATE ASSIGNMENT SUBMISSIONS
async function checkLateSubmissions(base44) {
  const submissions = await base44.entities.AssignmentSubmission.filter({
    is_late: true,
    status: { $in: ['Submitted', 'Late'] }
  });

  for (const submission of submissions) {
    // Check if alert already sent
    const existingAlert = await base44.entities.StudentNotification.filter({
      student_id: submission.student_id,
      category: 'Alert',
      message: { $regex: submission.assignment_id }
    });

    if (existingAlert.length > 0) continue;

    const assignment = await base44.entities.Assignment.get(submission.assignment_id);

    // Create policy violation alert
    await base44.entities.StudentNotification.create({
      student_id: submission.student_id,
      batch_id: assignment.batch_id,
      college_name: assignment.college_name,
      year: assignment.year,
      category: 'Alert',
      title: 'Policy Violation: Late Submission',
      message: `⚠️ POLICY VIOLATION: Assignment "${assignment.title}" was submitted late. Due: ${new Date(assignment.deadline).toLocaleString()}, Submitted: ${new Date(submission.submitted_at).toLocaleString()}. Late submissions may result in mark deductions as per academic policy.`,
      priority: 'Medium',
      link_url: `/assignments?id=${assignment.id}`,
      is_read: false,
      created_by: 'System'
    });
  }
}