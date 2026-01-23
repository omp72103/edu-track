import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon, MapPin, User } from "lucide-react";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable({ student }) {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState('');

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    setCurrentDay(today);
    fetchTimetable();
  }, [student]);

  const fetchTimetable = async () => {
    try {
      const allSchedules = await base44.entities.TimeTable.filter({
        batch_id: student.batch_id
      });

      const grouped = {};
      DAYS.forEach(day => {
        grouped[day] = allSchedules
          .filter(s => s.day_of_week === day)
          .sort((a, b) => {
            const timeA = a.time_slot?.split('-')[0]?.trim() || '';
            const timeB = b.time_slot?.split('-')[0]?.trim() || '';
            return timeA.localeCompare(timeB);
          });
      });

      // Use static timetable if no data
      if (allSchedules.length === 0) {
        const staticTimetable = {
          Monday: [
            { subject: 'Machine Learning', faculty_name: 'Dr. Anil Kumar', time_slot: '09:00 AM - 10:00 AM', room_number: 'Lab 301', class_type: 'Lecture' },
            { subject: 'Data Structures', faculty_name: 'Prof. Priya Sharma', time_slot: '10:15 AM - 11:15 AM', room_number: 'Room 205', class_type: 'Lecture' },
            { subject: 'Database Management', faculty_name: 'Dr. Rajesh Patil', time_slot: '11:30 AM - 12:30 PM', room_number: 'Room 304', class_type: 'Lecture' }
          ],
          Tuesday: [
            { subject: 'Computer Networks', faculty_name: 'Prof. Sneha Desai', time_slot: '09:00 AM - 10:00 AM', room_number: 'Room 202', class_type: 'Lecture' },
            { subject: 'Operating Systems', faculty_name: 'Dr. Amit Joshi', time_slot: '10:15 AM - 11:15 AM', room_number: 'Room 203', class_type: 'Lecture' },
            { subject: 'ML Lab', faculty_name: 'Dr. Anil Kumar', time_slot: '02:00 PM - 04:00 PM', room_number: 'Lab 301', class_type: 'Lab' }
          ],
          Wednesday: [
            { subject: 'Data Structures', faculty_name: 'Prof. Priya Sharma', time_slot: '09:00 AM - 10:00 AM', room_number: 'Room 205', class_type: 'Tutorial' },
            { subject: 'Database Management', faculty_name: 'Dr. Rajesh Patil', time_slot: '10:15 AM - 11:15 AM', room_number: 'Room 304', class_type: 'Lecture' },
            { subject: 'Software Engineering', faculty_name: 'Prof. Vikram Mehta', time_slot: '11:30 AM - 12:30 PM', room_number: 'Room 401', class_type: 'Lecture' }
          ],
          Thursday: [
            { subject: 'Machine Learning', faculty_name: 'Dr. Anil Kumar', time_slot: '09:00 AM - 10:00 AM', room_number: 'Lab 301', class_type: 'Practical' },
            { subject: 'Computer Networks', faculty_name: 'Prof. Sneha Desai', time_slot: '10:15 AM - 11:15 AM', room_number: 'Room 202', class_type: 'Lecture' },
            { subject: 'DS Lab', faculty_name: 'Prof. Priya Sharma', time_slot: '02:00 PM - 04:00 PM', room_number: 'Lab 201', class_type: 'Lab' }
          ],
          Friday: [
            { subject: 'Operating Systems', faculty_name: 'Dr. Amit Joshi', time_slot: '09:00 AM - 10:00 AM', room_number: 'Room 203', class_type: 'Lecture' },
            { subject: 'Software Engineering', faculty_name: 'Prof. Vikram Mehta', time_slot: '10:15 AM - 11:15 AM', room_number: 'Room 401', class_type: 'Lecture' },
            { subject: 'Database Lab', faculty_name: 'Dr. Rajesh Patil', time_slot: '02:00 PM - 04:00 PM', room_number: 'Lab 304', class_type: 'Lab' }
          ],
          Saturday: [
            { subject: 'Seminar', faculty_name: 'Various Faculty', time_slot: '09:00 AM - 11:00 AM', room_number: 'Auditorium', class_type: 'Tutorial' }
          ]
        };
        setTimetable(staticTimetable);
      } else {
        setTimetable(grouped);
      }
    } catch (error) {
      console.error("Error fetching timetable:", error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🗓️ Timetable</h1>
        <p className="text-gray-600 mt-1">Your weekly class schedule</p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setCurrentDay(day)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              currentDay === day
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-blue-50 border'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable View */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            {currentDay}'s Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {timetable[currentDay] && timetable[currentDay].length > 0 ? (
            <div className="space-y-3">
              {timetable[currentDay].map((slot, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex flex-col items-center justify-center text-white shadow-lg">
                      <span className="text-xs font-semibold">
                        {slot.time_slot?.split('-')[0]?.trim()?.split(':')[0] || ''}
                      </span>
                      <span className="text-2xl font-bold">
                        {slot.time_slot?.split('-')[0]?.trim()?.split(':')[1]?.split(' ')[0] || ''}
                      </span>
                      <span className="text-xs">
                        {slot.time_slot?.includes('AM') ? 'AM' : 'PM'}
                      </span>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{slot.subject}</h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4 text-blue-600" />
                          <span>{slot.faculty_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>{slot.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>{slot.room_number || 'TBA'}</span>
                        </div>
                      </div>
                      <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-semibold ${
                        slot.class_type === 'Lab' ? 'bg-purple-100 text-purple-700' :
                        slot.class_type === 'Practical' ? 'bg-green-100 text-green-700' :
                        slot.class_type === 'Tutorial' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {slot.class_type || 'Lecture'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No classes scheduled for {currentDay}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Week Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle>Full Week Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS.map(day => {
              const daySchedule = timetable[day] || [];
              const classCount = daySchedule.length;
              
              return (
                <div key={day} className={`p-4 rounded-xl border-2 ${currentDay === day ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <h4 className="font-bold text-gray-900 mb-2">{day}</h4>
                  <p className="text-2xl font-bold text-blue-600">{classCount}</p>
                  <p className="text-sm text-gray-600">{classCount === 1 ? 'class' : 'classes'}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}