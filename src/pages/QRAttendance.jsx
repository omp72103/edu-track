import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Session, Batch } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Clock, Users, MapPin, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const QR_EXPIRY_SECONDS = 60;

export default function QRAttendancePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [batch, setBatch] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [countdown, setCountdown] = useState(QR_EXPIRY_SECONDS);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStudents, setActiveStudents] = useState([]);
  const [insideGeofence, setInsideGeofence] = useState([]);
  const [outsideGeofence, setOutsideGeofence] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalTitle, setModalTitle] = useState("");

  // Get session_id from query parameters
  const urlParams = new URLSearchParams(location.search);
  const session_id = urlParams.get('session_id');

  const generateQRCodeData = useCallback(() => {
    if (!session || !batch) return;
    
    const timestamp = Date.now();
    const url = new URL(window.location.origin + createPageUrl("QRAttendanceStudent"));
    url.searchParams.append("session_id", session.id);
    url.searchParams.append("timestamp", timestamp);
    
    if (batch.batch_type === 'private') {
      url.searchParams.append("batch_type", "private");
    }
    
    // Use an external API to generate the QR code image
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url.toString())}&size=256x256&bgcolor=ffffff`;
    
    setQrCodeDataUrl(qrApiUrl);
    setCountdown(QR_EXPIRY_SECONDS);
  }, [session, batch]);

  useEffect(() => {
    const loadSessionAndBatch = async () => {
      if (!session_id) {
        console.error("No session_id found in URL parameters");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        console.log("Loading session with ID:", session_id);
        const sessionData = await Session.get(session_id);
        if (sessionData && sessionData.batch_id) {
          setSession(sessionData);
          const batchData = await Batch.filter({ batch_id: sessionData.batch_id });
          if (batchData.length > 0) {
            setBatch(batchData[0]);
          } else {
            setBatch({ batch_type: 'standard' }); // Fallback
          }
        }
      } catch (error) {
        console.error("Error loading session/batch data:", error);
      }
      setIsLoading(false);
    };
    loadSessionAndBatch();
  }, [session_id]);

  useEffect(() => {
    if (session && batch) {
      generateQRCodeData();
      const timer = setInterval(generateQRCodeData, QR_EXPIRY_SECONDS * 1000);
      return () => clearInterval(timer);
    }
  }, [session, batch, generateQRCodeData]);

  // Load active students real-time
  useEffect(() => {
    if (!session_id) return;

    const loadActiveStudents = async () => {
      try {
        const students = await base44.entities.QRActiveStudent.filter({ 
          session_id,
          status: 'active'
        });
        
        setActiveStudents(students);
        setInsideGeofence(students.filter(s => s.is_inside_geofence === true));
        setOutsideGeofence(students.filter(s => s.is_inside_geofence === false));
      } catch (error) {
        console.error("Error loading active students:", error);
      }
    };

    loadActiveStudents();
    const interval = setInterval(loadActiveStudents, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [session_id]);

  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, [qrCodeDataUrl]);

  if (!session_id) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Error: No Session ID Provided</h2>
        <p className="text-gray-600 mt-2">Please navigate back and try again.</p>
        <Button onClick={() => navigate(createPageUrl("Attendance"))} className="mt-4">
          Back to Attendance
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="p-8"><Skeleton className="h-96 w-full" /></div>
    );
  }

  if (!session) {
    return <div className="p-8 text-center text-red-500">Session not found.</div>;
  }

  const openModal = (students, title) => {
    setModalData(students);
    setModalTitle(title);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-4" 
          onClick={() => navigate(createPageUrl("Attendance"))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Attendance
        </Button>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* QR Code Card */}
          <Card className="md:col-span-2 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Scan for Attendance</CardTitle>
              <p className="text-slate-600">{session.session_name}</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <div className="bg-white p-4 rounded-lg border-4 border-slate-800">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Attendance QR Code" width={256} height={256} />
                ) : (
                  <Skeleton className="w-64 h-64" />
                )}
              </div>
              <div className="text-center">
                <p className="flex items-center justify-center gap-2 text-lg font-semibold text-red-600">
                  <Clock className="w-5 h-5 animate-spin" />
                  QR refreshes in: {countdown}s
                </p>
                <p className="text-xs text-slate-500 mt-1">Point your camera at the QR Code to mark attendance.</p>
              </div>
              <Button variant="outline" onClick={generateQRCodeData} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh QR Manually
              </Button>
            </CardContent>
          </Card>

          {/* Live Stats Card */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Live Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div 
                className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => openModal(activeStudents, 'All Active Students')}
              >
                <p className="text-sm text-blue-600 font-medium">Active Students</p>
                <p className="text-3xl font-bold text-blue-700">{activeStudents.length}</p>
                <p className="text-xs text-blue-500 mt-1">Click to view details</p>
              </div>

              <div 
                className="bg-green-50 border-2 border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
                onClick={() => openModal(insideGeofence, 'Students Inside Geo-Fence')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-600 font-medium">Inside Zone</p>
                </div>
                <p className="text-3xl font-bold text-green-700">{insideGeofence.length}</p>
                <p className="text-xs text-green-500 mt-1">Click to view details</p>
              </div>

              <div 
                className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={() => openModal(outsideGeofence, 'Students Outside Geo-Fence')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <p className="text-sm text-orange-600 font-medium">Outside Zone</p>
                </div>
                <p className="text-3xl font-bold text-orange-700">{outsideGeofence.length}</p>
                <p className="text-xs text-orange-500 mt-1">Click to view details</p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-gray-500 text-center">
                  🔄 Auto-refreshes every 5 seconds
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalTitle} ({modalData.length})</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {modalData.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No students found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3">Student Name</th>
                      <th className="text-left p-3">PRN</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3">Location</th>
                      <th className="text-left p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalData.map((student, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{student.student_name || 'N/A'}</td>
                        <td className="p-3">{student.prn}</td>
                        <td className="p-3 text-xs">{student.email || 'N/A'}</td>
                        <td className="p-3">
                          <Badge className={student.is_inside_geofence ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                            {student.is_inside_geofence ? '✓ Inside' : '⚠ Outside'}
                          </Badge>
                          {student.distance_from_geofence && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({Math.round(student.distance_from_geofence)}m)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {student.portal_opened_at ? format(new Date(student.portal_opened_at), 'HH:mm:ss') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}