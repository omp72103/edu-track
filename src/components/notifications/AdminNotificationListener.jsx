import { useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertCircle, MessageSquare, Mail, BellRing, Users, Calendar } from 'lucide-react';

export default function AdminNotificationListener({ userEmail, isAdmin }) {
  
  // Show browser notification helper
  const showBrowserNotification = useCallback((title, body, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: `edutrack-admin-${Date.now()}`,
        requireInteraction: options.urgent || false,
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        notification.close();
      };
    }
  }, []);

  // Register for push notifications
  useEffect(() => {
    if (!userEmail) return;

    // Request notification permission proactively
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          registerPushSubscription();
        }
      });
    } else if (Notification.permission === 'granted') {
      registerPushSubscription();
    }

    async function registerPushSubscription() {
      try {
        const existing = await base44.entities.PushSubscription.filter({ 
          user_email: userEmail 
        });
        
        if (existing.length === 0) {
          await base44.entities.PushSubscription.create({
            user_email: userEmail,
            user_type: isAdmin ? 'admin' : 'faculty',
            user_role: isAdmin ? 'admin' : 'user',
            is_active: true,
            device_info: navigator.userAgent,
            subscribed_at: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error registering push subscription:', error);
      }
    }
  }, [userEmail, isAdmin]);

  // Poll for pending notifications
  useEffect(() => {
    if (!userEmail) return;

    const checkPendingNotifications = async () => {
      try {
        const pending = await base44.entities.PendingPushNotification.filter({
          user_email: userEmail,
          sent: false
        });

        for (const notif of pending) {
          const payload = JSON.parse(notif.payload);
          
          // Show browser notification
          showBrowserNotification(payload.title, payload.body, {
            urgent: payload.data?.priority === 'Urgent',
            url: payload.data?.url
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

    checkPendingNotifications();
    const pollInterval = setInterval(checkPendingNotifications, 5000);

    return () => clearInterval(pollInterval);
  }, [userEmail, showBrowserNotification]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userEmail) return;

    // Subscribe to Complaints - for admin
    const unsubscribeComplaints = base44.entities.Complaint.subscribe((event) => {
      if (event.type === 'create' && isAdmin) {
        const complaint = event.data;
        const title = `🚨 New Complaint from ${complaint.student_name}`;
        const body = `Category: ${complaint.category} | ${complaint.issue?.substring(0, 80)}...`;
        
        toast.error(title, {
          description: body,
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 10000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/FeedbackComplaintsAdmin',
          },
        });

        showBrowserNotification(title, body, { 
          urgent: true, 
          url: '/FeedbackComplaintsAdmin' 
        });
      }
    });

    // Subscribe to Feedback - for admin
    const unsubscribeFeedback = base44.entities.Feedback.subscribe((event) => {
      if (event.type === 'create' && isAdmin) {
        const feedback = event.data;
        const title = `💬 New Feedback from ${feedback.student_name}`;
        const body = `Rating: ${feedback.rating}/5 | ${feedback.feedback_text?.substring(0, 80)}...`;
        
        toast.info(title, {
          description: body,
          icon: <MessageSquare className="w-5 h-5" />,
          duration: 8000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/FeedbackComplaintsAdmin',
          },
        });

        showBrowserNotification(title, body, { url: '/FeedbackComplaintsAdmin' });
      }
    });

    // Subscribe to Messages for this user
    const unsubscribeMessages = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data.receiver_email === userEmail) {
        const title = `✉️ New Message from ${event.data.sender_name}`;
        const body = event.data.subject;
        
        toast.info(title, {
          description: body,
          icon: <Mail className="w-5 h-5" />,
          duration: 6000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/Messages',
          },
        });

        showBrowserNotification(title, body, { url: '/Messages' });
      }
    });

    // Subscribe to new student registrations (for admin)
    const unsubscribeStudents = base44.entities.Student.subscribe((event) => {
      if (event.type === 'create' && isAdmin) {
        const title = `👨‍🎓 New Student Registered`;
        const body = `${event.data.name} joined ${event.data.batch_id}`;
        
        toast.success(title, {
          description: body,
          icon: <Users className="w-5 h-5" />,
          duration: 6000,
        });

        showBrowserNotification(title, body);
      }
    });

    // Subscribe to new sessions
    const unsubscribeSessions = base44.entities.Session.subscribe((event) => {
      if (event.type === 'create') {
        const title = `📅 New Session Created`;
        const body = `${event.data.session_name} by ${event.data.faculty_name}`;
        
        toast.info(title, {
          description: body,
          icon: <Calendar className="w-5 h-5" />,
          duration: 6000,
        });
      }
    });

    return () => {
      unsubscribeComplaints();
      unsubscribeFeedback();
      unsubscribeMessages();
      unsubscribeStudents();
      unsubscribeSessions();
    };
  }, [userEmail, isAdmin, showBrowserNotification]);

  return null;
}