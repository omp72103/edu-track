import React, { useState, useEffect, useMemo } from "react";
import { Session, Faculty, AttendanceRecord } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Filter, Eye, Calendar, Users } from "lucide-react";
import { format } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper function to parse duration string to hours
const parseDurationToHours = (duration) => {
    if (typeof duration !== 'string') return 0;
    const parts = duration.split(' ');
    if (parts.length < 2) return 0;
    const value = parseFloat(parts[0]);
    const unit = parts[1].toLowerCase();
    if (isNaN(value)) return 0;
    if (unit.startsWith('hour')) return value;
    if (unit.startsWith('min')) return value / 60;
    return 0;
};

export default function FacultyReport() {
    const [sessions, setSessions] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [showFacultyDetails, setShowFacultyDetails] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [sessionData, facultyData, attendanceData] = await Promise.all([
                    Session.list('-created_date', 500),
                    Faculty.list(),
                    AttendanceRecord.list(null, 1000)
                ]);
                setSessions(sessionData);
                setFaculty(facultyData);
                setAttendanceRecords(attendanceData);
            } catch (error) {
                console.error("Error fetching report data:", error);
            }
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const facultyReportData = useMemo(() => {
        const report = faculty.map(f => {
            const facultySessions = sessions.filter(s => s.faculty_email === f.email);
            const totalSessions = facultySessions.length;
            const completed = facultySessions.filter(s => s.status === 'completed').length;
            const scheduled = facultySessions.filter(s => s.status === 'scheduled').length;
            const totalHours = facultySessions.reduce((sum, s) => sum + parseDurationToHours(s.duration), 0);
            
            // Calculate students attended from attendance records
            const sessionIds = facultySessions.map(s => s.id);
            const sessionAttendance = attendanceRecords.filter(r => sessionIds.includes(r.session_id));
            const studentsAttended = sessionAttendance.filter(r => r.is_present).length;

            return {
                id: f.id,
                facultyName: f.name,
                email: f.email,
                department: f.department,
                totalSessions,
                completed,
                scheduled,
                totalHours: totalHours.toFixed(1),
                studentsAttended,
                sessions: facultySessions
            };
        });
        return report;
    }, [sessions, faculty, attendanceRecords]);
    
    const exportToCSV = () => {
        const headers = ["Faculty Name", "Email", "Department", "Total Sessions", "Completed", "Scheduled", "Total Hours", "Students Attended"];
        const rows = facultyReportData.map(row => 
            [
                row.facultyName,
                row.email,
                row.department,
                row.totalSessions,
                row.completed,
                row.scheduled,
                row.totalHours,
                row.studentsAttended
            ].join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `faculty_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleViewFacultyDetails = (facultyData) => {
        setSelectedFaculty(facultyData);
        setShowFacultyDetails(true);
    };

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">📊 Faculty Tracking Report</h1>
                            <p className="text-gray-600">Track faculty performance and session analytics</p>
                        </div>
                    </div>
                </div>

                <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                            <Filter className="w-5 h-5" />
                            🎯 Actions & Export
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-4">
                        <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700 text-white">
                            <Download className="w-4 h-4 mr-2" />
                            📊 Export Report
                        </Button>
                        <div className="text-sm text-gray-600">
                            Total Faculty: <strong>{faculty.length}</strong> | 
                            Total Sessions: <strong>{sessions.length}</strong>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                            <Users className="w-5 h-5" />
                            👥 Faculty Performance Tracking
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="font-semibold text-gray-700">👤 Faculty Name</TableHead>
                                            <TableHead className="font-semibold text-gray-700">🏢 Department</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">📚 Total Sessions</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">✅ Completed</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">📅 Scheduled</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">⏰ Total Hours</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">👥 Students Attended</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-center">⚙️ Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {facultyReportData.map((row, index) => (
                                            <TableRow key={index} className="hover:bg-gray-50">
                                                <TableCell className="font-medium text-gray-800">{row.facultyName}</TableCell>
                                                <TableCell className="text-gray-600">{row.department}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {row.totalSessions}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className="bg-green-500 text-white">
                                                        {row.completed}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                        {row.scheduled}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-semibold text-gray-800">
                                                    {row.totalHours}h
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                                        {row.studentsAttended}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleViewFacultyDetails(row)}
                                                        className="hover:bg-blue-50"
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        👁️ View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Faculty Details Dialog */}
            <Dialog open={showFacultyDetails} onOpenChange={setShowFacultyDetails}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Users className="w-6 h-6" />
                            👤 {selectedFaculty?.facultyName} - Session Details
                        </DialogTitle>
                    </DialogHeader>
                    {selectedFaculty && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600">📧 Email</p>
                                    <p className="font-semibold">{selectedFaculty.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">🏢 Department</p>
                                    <p className="font-semibold">{selectedFaculty.department}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">⏰ Total Hours</p>
                                    <p className="font-semibold">{selectedFaculty.totalHours}h</p>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    📚 Sessions Conducted ({selectedFaculty.sessions.length})
                                </h3>
                                {selectedFaculty.sessions.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">📭 No sessions found for this faculty</p>
                                ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {selectedFaculty.sessions
                                            .sort((a, b) => new Date(b.session_date) - new Date(a.session_date))
                                            .map((session) => (
                                            <div key={session.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">📖 {session.session_name}</p>
                                                        <p className="text-sm text-gray-600">🎯 {session.topic_taught}</p>
                                                        <p className="text-xs text-gray-500">
                                                            📅 {format(new Date(session.session_date), 'dd MMM yyyy')} | 
                                                            ⏰ {session.session_time} | 
                                                            🏛️ {session.college_name}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge className={
                                                            session.status === 'completed' ? 'bg-green-500 text-white' :
                                                            session.status === 'active' ? 'bg-blue-500 text-white' :
                                                            'bg-orange-500 text-white'
                                                        }>
                                                            {session.status}
                                                        </Badge>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {session.present_count || 0}/{session.total_students || 0} present
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}