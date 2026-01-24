import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertCircle, MessageSquare, Mail } from 'lucide-react';

export default function AdminNotificationListener({ userEmail, isAdmin }) {
  useEffect(() => {
    if (!userEmail) return;

    // Subscribe to Complaints - for admin
    const unsubscribeComplaints = base44.entities.Complaint.subscribe((event) => {
      if (event.type === 'create' && isAdmin) {
        const complaint = event.data;
        
        toast.error(`🚨 New Complaint from ${complaint.student_name}`, {
          description: `Category: ${complaint.category} | ${complaint.issue?.substring(0, 80)}...`,
          icon: <AlertCircle className="w-5 h-5" />,
          duration: 10000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/FeedbackComplaintsAdmin',
          },
        });

        // Browser notification for complaints
        if (Notification.permission === 'granted') {
          new Notification(`🚨 New Complaint: ${complaint.category}`, {
            body: `From: ${complaint.student_name}\n${complaint.issue?.substring(0, 100)}`,
            icon: '/logo.png',
            requireInteraction: true,
          });
        }
      }
    });

    // Subscribe to Feedback - for admin
    const unsubscribeFeedback = base44.entities.Feedback.subscribe((event) => {
      if (event.type === 'create' && isAdmin) {
        const feedback = event.data;
        
        toast.info(`💬 New Feedback from ${feedback.student_name}`, {
          description: `Rating: ${feedback.rating}/5 | ${feedback.feedback_text?.substring(0, 80)}...`,
          icon: <MessageSquare className="w-5 h-5" />,
          duration: 8000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/FeedbackComplaintsAdmin',
          },
        });
      }
    });

    // Subscribe to Messages for this user
    const unsubscribeMessages = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data.receiver_email === userEmail) {
        toast.info(`✉️ New Message from ${event.data.sender_name}`, {
          description: event.data.subject,
          icon: <Mail className="w-5 h-5" />,
          duration: 6000,
          action: {
            label: 'View',
            onClick: () => window.location.href = '/Messages',
          },
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
      unsubscribeComplaints();
      unsubscribeFeedback();
      unsubscribeMessages();
    };
  }, [userEmail, isAdmin]);

  return null; // This is a listener component, no UI
}