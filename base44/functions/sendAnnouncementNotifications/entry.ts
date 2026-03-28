import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { announcementId } = await req.json();
    
    // Get announcement details
    const announcement = await base44.asServiceRole.entities.Announcement.get(announcementId);
    
    if (!announcement) {
      return Response.json({ error: 'Announcement not found' }, { status: 404 });
    }

    let targetStudents = [];
    
    // Get students based on recipient type
    if (announcement.recipient_type === 'All' || announcement.recipient_type === 'Students') {
      targetStudents = await base44.asServiceRole.entities.Student.list();
    } else if (announcement.recipient_type === 'Batch' && announcement.batch_id) {
      targetStudents = await base44.asServiceRole.entities.Student.filter({ 
        batch_id: announcement.batch_id 
      });
    }

    // Create notifications for each student
    const notifications = targetStudents.map(student => ({
      student_id: student.id,
      batch_id: student.batch_id,
      title: announcement.title,
      message: announcement.message,
      category: announcement.category || 'General',
      priority: announcement.priority || 'Medium',
      is_read: false
    }));

    // Bulk create notifications
    if (notifications.length > 0) {
      await Promise.all(
        notifications.map(notif => 
          base44.asServiceRole.entities.StudentNotification.create(notif)
        )
      );
    }

    return Response.json({ 
      success: true, 
      notificationsSent: notifications.length 
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});