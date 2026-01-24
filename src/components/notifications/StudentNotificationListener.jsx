import { useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, Megaphone, MessageSquare, FileText, BellRing } from 'lucide-react';
import { sendPushNotification } from './PushNotificationManager';

export default function StudentNotificationListener({ studentEmail }) {
  
  // Show browser notification helper
  const showBrowserNotification = useCallback((title, body, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `edutrack-${Date.now()}`,
        requireInteraction: options.urgent || false,
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Register for push notifications
  useEffect(() => {
    if (!studentEmail) return;

    // Request notification permission proactively
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // Register push subscription
          registerPushSubscription();
        }
      });
    } else if (Notification.permission === 'granted') {
      registerPushSubscription();
    }

    async function registerPushSubscription() {
      try {
        const existing = await base44.entities.PushSubscription.filter({ 
          user_email: studentEmail 
        });
        
        if (existing.length === 0) {
          await base44.entities.PushSubscription.create({
            user_email: studentEmail,
            user_type: 'student',
            user_role: 'user',
            is_active: true,
            device_info: navigator.userAgent,
            subscribed_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error registering push subscription:', error);
      }
    }
  }, [studentEmail]);

  // Poll for pending notifications (works even in background)
  useEffect(() => {
    if (!studentEmail) return;

    const checkPendingNotifications = async () => {
      try {
        const pending = await base44.entities.PendingPushNotification.filter({
          user_email: studentEmail,
          sent: false
        });

        for (const notif of pending) {
          const payload = JSON.parse(notif.payload);
          
          // Show browser notification
          showBrowserNotification(payload.title, payload.body, {
            urgent: payload.data?.priority === 'Urgent'
          });

          // Show in-app toast if app is visible
          if (document.visibilityState === 'visible') {
            toast.info(payload.title, {
              description: payload.body,
              icon: <BellRing className="w-5 h-5" />,
              duration: 8000,
            });
          }

          // Mark as sent
          await base44.entities.PendingPushNotification.update(notif.id, { sent: true });
        }
      } catch (error) {
        // Silent fail
      }
    };

    // Check immediately and then every 5 seconds
    checkPendingNotifications();
    const pollInterval = setInterval(checkPendingNotifications, 5000);

    return () => clearInterval(pollInterval);
  }, [studentEmail, showBrowserNotification]);

  // Real-time subscriptions
  useEffect(() => {
    if (!studentEmail) return;

    // Subscribe to StudentNotification entity
    const unsubscribeNotifications = base44.entities.StudentNotification.subscribe((event) => {
      if (event.type === 'create' && event.data.student_email === studentEmail) {
        const title = event.data.title || 'New Notification';
        const body = event.data.message;
        
        toast.success(title, {
          description: body,
          icon: <Bell className="w-5 h-5" />,
          duration: 6000,
        });

        showBrowserNotification(`🔔 ${title}`, body);
      }
    });

    // Subscribe to Announcements
    const unsubscribeAnnouncements = base44.entities.Announcement.subscribe((event) => {
      if (event.type === 'create') {
        const announcement = event.data;
        
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

          showBrowserNotification(
            `${priority} ${announcement.title}`,
            announcement.message,
            { urgent: announcement.priority === 'Urgent' }
          );
        }
      }
    });

    // Subscribe to Messages
    const unsubscribeMessages = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data.receiver_email === studentEmail) {
        const title = `✉️ New Message from ${event.data.sender_name}`;
        const body = event.data.subject;
        
        toast.info(title, {
          description: body,
          icon: <MessageSquare className="w-5 h-5" />,
          duration: 6000,
        });

        showBrowserNotification(title, body);
      }
    });

    // Subscribe to Assignment updates
    const unsubscribeAssignments = base44.entities.Assignment.subscribe((event) => {
      if (event.type === 'create') {
        const title = `📝 New Assignment: ${event.data.title}`;
        const body = `Subject: ${event.data.subject} | Due: ${event.data.deadline}`;
        
        toast.info(title, {
          description: body,
          icon: <FileText className="w-5 h-5" />,
          duration: 8000,
        });

        showBrowserNotification(title, body);
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeAnnouncements();
      unsubscribeMessages();
      unsubscribeAssignments();
    };
  }, [studentEmail, showBrowserNotification]);

  return null;
}