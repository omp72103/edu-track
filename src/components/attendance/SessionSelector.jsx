import React, { useState, useEffect } from "react";
import { Session } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, BookOpen, GraduationCap, QrCode } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function SessionSelector({ onSessionSelect, onQRSessionSelect, isLoading }) {
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const availableSessions = await Session.filter({ status: 'scheduled' }, '-session_date', 200);
      setSessions(availableSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
    setLoadingSessions(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loadingSessions) {
    return (
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="bg-blue-600 text-white">
          <CardTitle className="text-xl flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            Select a Scheduled Session
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4 border">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-4" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader className="bg-blue-600 text-white">
        <CardTitle className="text-xl flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          Select a Scheduled Session
        </CardTitle>
        <p className="text-blue-100 mt-1">Choose any scheduled session and select your attendance method</p>
      </CardHeader>
      
      <CardContent className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📭 No Scheduled Sessions Found</h3>
            <p className="text-gray-600">Create a session first to take attendance.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <h3 className="font-bold text-gray-900 text-sm">{session.session_name}</h3>
                      </div>
                      <Badge className={`text-xs ${getStatusColor(session.status)}`}>
                        {session.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        📖 {session.topic_taught}
                      </p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        📅 {format(new Date(session.session_date), "dd MMM yyyy")}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ⏰ {session.session_time} ({session.duration})
                      </p>
                      <p className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        👨‍🎓 {session.faculty_name}
                      </p>
                      <p className="text-xs">
                        🏛️ {session.college_name}
                      </p>
                      <p className="text-xs">
                        📚 {session.year} - {session.branch || session.batch_description}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => onSessionSelect(session)}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2"
                      >
                        📝 Manual Attendance
                      </Button>
                      
                      <Button
                        onClick={() => onQRSessionSelect(session)}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2"
                      >
                        <QrCode className="w-3 h-3 mr-1" />
                        QR Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}