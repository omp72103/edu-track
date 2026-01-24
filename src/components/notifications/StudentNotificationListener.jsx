import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, Megaphone, MessageSquare } from 'lucide-react';

export default function StudentNotificationListener({ studentEmail }) {
  useEffect(() => {
    if (!studentEmail) return;

    // Subscribe to StudentNotification entity
    const unsubscribeNotifications = base44.entities.StudentNotification.subscribe((event) => {
      if (event.type === 'create' && event.data.student_email === studentEmail) {
        toast.success(event.data.title || 'New Notification', {
          description: event.data.message,
          icon: <Bell className="w-5 h-5" />,
          duration: 6000,
        });

        // Browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(event.data.title || 'EDU TRACK - New Notification', {
            body: event.data.message,
            icon: '/logo.png',
            badge: '/logo.png',
          });
        }
      }
    });

    // Subscribe to Announcements
    const unsubscribeAnnouncements = base44.entities.Announcement.subscribe((event) => {
      if (event.type === 'create') {
        const announcement = event.data;
        
        // Check if announcement is for this student
        const isForStudent = announcement.recipient_type === 'All' || 
                            announcement.recipient_type === 'Students';
        
        if (isForStudent) {
          const priority = announcement.priority === 'Urgent' ? '🚨' : 
                          announcement.priority === 'High' ? '⚠️' : '📢';
          
          toast.info(`${priority} ${announcement.title}`, {
            description: announcement.message,
            icon: <Megaphone className="w-5 h-5" />,
            duration: 8000,
          });

          // Browser notification for urgent announcements
          if (announcement.priority === 'Urgent' && Notification.permission === 'granted') {
            new Notification(`🚨 URGENT: ${announcement.title}`, {
              body: announcement.message,
              icon: '/logo.png',
              requireInteraction: true,
            });
          }
        }
      }
    });

    // Subscribe to Messages
    const unsubscribeMessages = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data.receiver_email === studentEmail) {
        toast.info(`✉️ New Message from ${event.data.sender_name}`, {
          description: event.data.subject,
          icon: <MessageSquare className="w-5 h-5" />,
          duration: 6000,
        });

        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`New Message from ${event.data.sender_name}`, {
            body: event.data.subject,
            icon: '/logo.png',
          });
        }
      }
    });

    // Request notification permission on first load
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup subscriptions
    return () => {
      unsubscribeNotifications();
      unsubscribeAnnouncements();
      unsubscribeMessages();
    };
  }, [studentEmail]);

  return null; // This is a listener component, no UI
}