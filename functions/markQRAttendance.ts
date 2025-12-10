import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Parse request body
        const body = await req.json();
        const { session_id, timestamp, student_identifier, batch_type } = body;

        // SECURITY CHECK 1: Validate required parameters
        if (!session_id || !timestamp || !student_identifier) {
            return Response.json({ 
                success: false, 
                error: "Missing required parameters" 
            }, { status: 400 });
        }

        // SECURITY CHECK 2: Validate timestamp (45-second expiry)
        const qrTimestamp = parseInt(timestamp);
        const now = Date.now();
        const qrAge = (now - qrTimestamp) / 1000;

        if (isNaN(qrTimestamp) || qrTimestamp <= 0) {
            return Response.json({ 
                success: false, 
                error: "Invalid timestamp" 
            }, { status: 400 });
        }

        if (qrTimestamp > now + 5000) {
            return Response.json({ 
                success: false, 
                error: "Invalid QR code - timestamp is in the future" 
            }, { status: 400 });
        }

        if (qrAge > 45) {
            return Response.json({ 
                success: false, 
                error: `QR code expired ${Math.floor(qrAge)} seconds ago. Please ask your faculty for a new QR code.`,
                expired: true
            }, { status: 400 });
        }

        // Use service role for all operations (no student login required)
        const sessionData = await base44.asServiceRole.entities.Session.get(session_id);
        
        if (!sessionData) {
            return Response.json({ 
                success: false, 
                error: "Session not found" 
            }, { status: 404 });
        }

        // Find student by PRN or Roll Number
        let student = null;
        const isPrivateBatch = batch_type === 'private';

        if (!isPrivateBatch) {
            // Standard/Custom batch: Try PRN first, then roll number
            const studentsByPRN = await base44.asServiceRole.entities.Student.filter({ 
                batch_id: sessionData.batch_id, 
                prn: student_identifier.trim() 
            });
            
            if (studentsByPRN.length > 0) {
                student = studentsByPRN[0];
            } else {
                const studentsByRoll = await base44.asServiceRole.entities.Student.filter({ 
                    batch_id: sessionData.batch_id, 
                    roll_no: student_identifier.trim() 
                });
                if (studentsByRoll.length > 0) {
                    student = studentsByRoll[0];
                }
            }
        } else {
            // Private batch: Search by roll number only
            const studentsByRoll = await base44.asServiceRole.entities.Student.filter({ 
                batch_id: sessionData.batch_id, 
                roll_no: student_identifier.trim() 
            });
            if (studentsByRoll.length > 0) {
                student = studentsByRoll[0];
            }
        }

        if (!student) {
            return Response.json({ 
                success: false, 
                error: isPrivateBatch 
                    ? "Roll number not found in this batch. Please check and try again." 
                    : "PRN or roll number not found in this batch. Please check and try again."
            }, { status: 404 });
        }

        // Check if attendance already marked
        const existingAttendance = await base44.asServiceRole.entities.AttendanceRecord.filter({
            student_id: student.id,
            session_id: sessionData.id
        });

        let message = "";
        let already_marked = false;

        if (existingAttendance.length > 0) {
            if (existingAttendance[0].is_present) {
                message = `Welcome back, ${student.name}! Your attendance was already marked as Present.`;
                already_marked = true;
            } else {
                await base44.asServiceRole.entities.AttendanceRecord.update(existingAttendance[0].id, { 
                    is_present: true,
                    marked_at: new Date().toISOString()
                });
                message = `Great! ${student.name}, your attendance has been updated to Present.`;
            }
        } else {
            await base44.asServiceRole.entities.AttendanceRecord.create({
                student_id: student.id,
                session_id: sessionData.id,
                batch_id: sessionData.batch_id,
                is_present: true,
                marked_at: new Date().toISOString(),
                marked_by: 'qr_scan'
            });
            message = `Perfect! ${student.name}, your attendance has been marked successfully.`;
        }

        return Response.json({ 
            success: true, 
            message,
            already_marked,
            student_name: student.name,
            session: {
                name: sessionData.session_name,
                topic: sessionData.topic_taught,
                date: sessionData.session_date,
                time: sessionData.session_time,
                faculty: sessionData.faculty_name,
                college: sessionData.college_name
            }
        });

    } catch (error) {
        console.error("Error in markQRAttendance:", error);
        return Response.json({ 
            success: false, 
            error: "Internal server error. Please try again or contact your faculty.",
            details: error.message 
        }, { status: 500 });
    }
});