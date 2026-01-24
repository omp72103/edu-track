import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PushNotificationManager({ userEmail, userType, userRole }) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if (!userEmail) return;

    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if already subscribed
    checkSubscription();

    // Register service worker for push
    registerServiceWorker();

    // Poll for pending notifications (fallback for when app is open)
    const pollInterval = setInterval(checkPendingNotifications, 10000);

    return () => clearInterval(pollInterval);
  }, [userEmail]);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        console.log('✅ Push Service Worker registered:', registration);
      } catch (error) {
        console.error('❌ Push SW registration failed:', error);
      }
    }
  };

  const checkSubscription = async () => {
    try {
      const subs = await base44.entities.PushSubscription.filter({ 
        user_email: userEmail, 
        is_active: true 
      });
      setIsSubscribed(subs.length > 0);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const checkPendingNotifications = async () => {
    if (!userEmail) return;
    
    try {
      const pending = await base44.entities.PendingPushNotification.filter({
        user_email: userEmail,
        sent: false
      });

      for (const notif of pending) {
        const payload = JSON.parse(notif.payload);
        
        // Show in-app toast
        toast.info(payload.title, {
          description: payload.body,
          icon: <BellRing className="w-5 h-5" />,
          duration: 8000,
        });

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/logo.png',
            badge: payload.badge || '/logo.png',
            tag: payload.tag,
            data: payload.data,
            requireInteraction: payload.data?.priority === 'Urgent'
          });
        }

        // Mark as sent
        await base44.entities.PendingPushNotification.update(notif.id, { sent: true });
      }
    } catch (error) {
      // Silently fail - don't spam console
    }
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      await subscribeUser();
      toast.success('🔔 Notifications enabled!', {
        description: 'You will now receive push notifications'
      });
    } else if (result === 'denied') {
      toast.error('Notifications blocked', {
        description: 'Please enable notifications in your browser settings'
      });
    }
  };

  const subscribeUser = async () => {
    try {
      // Check if already subscribed
      const existing = await base44.entities.PushSubscription.filter({ 
        user_email: userEmail 
      });

      if (existing.length === 0) {
        await base44.entities.PushSubscription.create({
          user_email: userEmail,
          user_type: userType || 'student',
          user_role: userRole || 'user',
          is_active: true,
          device_info: navigator.userAgent,
          subscribed_at: new Date().toISOString()
        });
      } else {
        // Reactivate existing subscription
        await base44.entities.PushSubscription.update(existing[0].id, { is_active: true });
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error('Error subscribing:', error);
    }
  };

  const unsubscribe = async () => {
    try {
      const subs = await base44.entities.PushSubscription.filter({ user_email: userEmail });
      for (const sub of subs) {
        await base44.entities.PushSubscription.update(sub.id, { is_active: false });
      }
      setIsSubscribed(false);
      toast.info('Notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  // Show enable button if not subscribed
  if (permission !== 'granted' || !isSubscribed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={requestPermission}
        className="gap-2"
      >
        <Bell className="w-4 h-4" />
        Enable Notifications
      </Button>
    );
  }

  return null;
}

// Helper function to send push notifications from anywhere in the app
export async function sendPushNotification({ title, body, targetEmails, targetType, data }) {
  try {
    // Create notification records directly
    const base44Client = (await import('@/api/base44Client')).base44;
    
    let subscriptions = [];
    
    if (targetEmails && targetEmails.length > 0) {
      for (const email of targetEmails) {
        const userSubs = await base44Client.entities.PushSubscription.filter({ 
          user_email: email, 
          is_active: true 
        });
        subscriptions.push(...userSubs);
      }
    } else if (targetType === 'admin') {
      subscriptions = await base44Client.entities.PushSubscription.filter({ 
        user_role: 'admin', 
        is_active: true 
      });
    } else if (targetType === 'students') {
      subscriptions = await base44Client.entities.PushSubscription.filter({ 
        user_type: 'student', 
        is_active: true 
      });
    }

    const payload = JSON.stringify({
      title: title || 'EDU TRACK',
      body: body || '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: `edutrack-${Date.now()}`,
      data: data || {},
      timestamp: Date.now()
    });

    // Create pending notifications for each subscriber
    for (const sub of subscriptions) {
      await base44Client.entities.PendingPushNotification.create({
        subscription_id: sub.id,
        user_email: sub.user_email,
        payload: payload,
        sent: false
      });
    }

    return { success: true, count: subscriptions.length };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}