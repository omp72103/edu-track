import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Web Push notification sender
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { title, body, icon, badge, tag, data, targetEmails, targetType } = await req.json();

    // Get all push subscriptions
    let subscriptions = [];
    
    if (targetEmails && targetEmails.length > 0) {
      // Send to specific users
      for (const email of targetEmails) {
        const userSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: email });
        subscriptions.push(...userSubs);
      }
    } else if (targetType === 'admin') {
      // Send to all admins
      subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_role: 'admin' });
    } else if (targetType === 'students') {
      // Send to all students
      subscriptions = await base44.asServiceRole.entities.PushSubscription.filter({ user_type: 'student' });
    } else if (targetType === 'all') {
      // Send to everyone
      subscriptions = await base44.asServiceRole.entities.PushSubscription.list();
    }

    const payload = JSON.stringify({
      title: title || 'EDU TRACK Notification',
      body: body || '',
      icon: icon || '/logo.png',
      badge: badge || '/logo.png',
      tag: tag || 'edutrack-notification',
      data: data || {},
      timestamp: Date.now()
    });

    // For each subscription, we'll store the notification for the service worker to fetch
    // Since we can't do actual web push without VAPID keys, we'll store pending notifications
    for (const sub of subscriptions) {
      await base44.asServiceRole.entities.PendingPushNotification.create({
        subscription_id: sub.id,
        user_email: sub.user_email,
        payload: payload,
        sent: false,
        created_at: new Date().toISOString()
      });
    }

    return Response.json({ 
      success: true, 
      message: `Notification queued for ${subscriptions.length} subscribers` 
    });
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});