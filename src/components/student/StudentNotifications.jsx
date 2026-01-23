import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function StudentNotifications({ student, setUnreadCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [student]);

  const fetchNotifications = async () => {
    try {
      const list = await base44.entities.StudentNotification.filter({
        student_id: student.id
      }, '-created_date');
      
      const batchNotifications = await base44.entities.StudentNotification.filter({
        batch_id: student.batch_id,
        student_id: null
      }, '-created_date');

      const allNotifications = [...list, ...batchNotifications];
      
      // Use static notifications if no data
      if (allNotifications.length === 0) {
        const staticNotifications = [
          {
            id: '1',
            title: 'Mid-Semester Exam Schedule Released',
            message: 'Mid-semester examination schedule has been published. Please check the timetable section for detailed schedule. Exams begin from February 5th.',
            category: 'Exam',
            priority: 'Urgent',
            is_read: false,
            created_date: '2026-01-22T10:00:00'
          },
          {
            id: '2',
            title: 'Machine Learning Assignment Deadline Extended',
            message: 'Due to technical issues, the ML Neural Network assignment deadline has been extended to January 30th. Make use of extra time.',
            category: 'Assignment',
            priority: 'High',
            is_read: false,
            created_date: '2026-01-21T14:30:00'
          },
          {
            id: '3',
            title: 'Guest Lecture: AI in Healthcare',
            message: 'Special guest lecture on "AI Applications in Healthcare" by Dr. Sharma on January 27th at 2 PM in the auditorium. All students are encouraged to attend.',
            category: 'Event',
            priority: 'Medium',
            is_read: true,
            created_date: '2026-01-20T09:00:00'
          },
          {
            id: '4',
            title: 'Lab Booking Available',
            message: 'Computer Lab 301 is now available for student project work on weekends. Book slots through the portal.',
            category: 'General',
            priority: 'Low',
            is_read: true,
            created_date: '2026-01-19T11:00:00'
          },
          {
            id: '5',
            title: 'Attendance Alert',
            message: 'Your attendance in Database Management is below 75%. Please ensure regular attendance to meet the minimum requirement.',
            category: 'Alert',
            priority: 'High',
            is_read: false,
            created_date: '2026-01-18T16:00:00'
          }
        ];
        setNotifications(staticNotifications);
        setUnreadCount(staticNotifications.filter(n => !n.is_read).length);
      } else {
        setNotifications(allNotifications);
        const unread = allNotifications.filter(n => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await base44.entities.StudentNotification.update(notificationId, {
        is_read: true,
        read_at: new Date().toISOString()
      });
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifs.map(n => base44.entities.StudentNotification.update(n.id, { is_read: true }))
      );
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.category === filter);

  if (loading) {
    return <div className="h-64 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔔 Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with announcements</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <Button onClick={markAllAsRead} variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'Academic', 'Assignment', 'Exam', 'General', 'Event', 'Alert'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${
              filter === cat
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-blue-50'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.map(notif => (
          <Card 
            key={notif.id} 
            className={`border-0 shadow-lg transition-all ${notif.is_read ? 'opacity-60' : 'border-l-4 border-blue-500'}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {!notif.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                    <h3 className="font-bold text-gray-900">{notif.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notif.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                      notif.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      notif.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {notif.priority}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {notif.category}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{notif.message}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(notif.created_date), 'PPP p')}
                  </p>
                </div>
                {!notif.is_read && (
                  <Button 
                    onClick={() => markAsRead(notif.id)} 
                    size="sm"
                    variant="outline"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}