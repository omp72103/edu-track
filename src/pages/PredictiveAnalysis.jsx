import React, { useState, useEffect } from "react";
import { Student, AttendanceRecord, AttendanceSession, StudentPerformance, Batch } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  TrendingDown, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  Loader2,
  ChevronRight,
  Target,
  BookOpen,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Download
} from "lucide-react";
import { format, addDays, addMonths } from "date-fns";

export default function PredictiveAnalysis() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [eventPredictions, setEventPredictions] = useState(null);
  const [studentRisks, setStudentRisks] = useState([]);
  const [customEvent, setCustomEvent] = useState("");
  const [predictionPeriod, setPredictionPeriod] = useState("1month");
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [advancedAnalysisData, setAdvancedAnalysisData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      loadStudentsForBatch();
    }
  }, [selectedBatch]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const batchData = await Batch.list();
      setBatches(batchData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const loadStudentsForBatch = async () => {
    try {
      const studentData = await Student.filter({ batch_id: selectedBatch });
      
      // Load attendance records for each student
      const studentsWithAttendance = await Promise.all(
        studentData.map(async (student) => {
          const records = await AttendanceRecord.filter({ student_id: student.id });
          const performances = await StudentPerformance.filter({ student_id: student.id });
          
          const totalClasses = records.length;
          const presentClasses = records.filter(r => r.is_present).length;
          const attendancePercent = totalClasses > 0 ? ((presentClasses / totalClasses) * 100) : 0;
          
          // Calculate average performance
          const avgPerformance = performances.length > 0
            ? performances.reduce((sum, p) => sum + (p.percentage || 0), 0) / performances.length
            : 0;
          
          return {
            ...student,
            totalClasses,
            presentClasses,
            absentClasses: totalClasses - presentClasses,
            attendancePercent: attendancePercent.toFixed(1),
            avgPerformance: avgPerformance.toFixed(1),
            performances
          };
        })
      );
      
      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const generateEventPredictions = async () => {
    setIsPredicting(true);
    try {
      const today = new Date();
      const endDate = predictionPeriod === "1month" ? addMonths(today, 1) : 
                      predictionPeriod === "2months" ? addMonths(today, 2) : addMonths(today, 3);
      
      const prompt = `You are an educational attendance prediction system for Indian colleges. Analyze and predict attendance patterns.

Current Date: ${format(today, 'dd MMMM yyyy')}
Prediction Period: ${format(today, 'dd MMM yyyy')} to ${format(endDate, 'dd MMM yyyy')}
${customEvent ? `Custom Event to Consider: ${customEvent}` : ''}

Based on the Indian academic calendar, festivals, and common events, predict attendance impact for the given period.

Consider these factors:
1. Major Indian festivals (Ganesh Chaturthi, Diwali, Holi, Eid, Christmas, Pongal, Onam, Durga Puja, etc.)
2. National holidays (Independence Day, Republic Day, Gandhi Jayanti)
3. College events (Annual Day, Sports Day, Cultural Fest, Technical Fest)
4. Exam periods (Mid-terms, Finals, Practicals)
5. Weather conditions (Monsoon, Extreme heat)
6. Long weekends and bridge holidays
7. Regional festivals based on college location

Provide a detailed prediction with:
1. List of upcoming events/festivals with dates
2. Expected attendance drop percentage for each event
3. Number of days likely to be affected
4. Recommendations for faculty/administration

Be specific with dates and realistic with predictions.`;

      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Overall prediction summary" },
            predicted_events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_name: { type: "string" },
                  event_date: { type: "string" },
                  event_type: { type: "string", enum: ["festival", "holiday", "college_event", "exam", "weather", "other"] },
                  expected_attendance_drop: { type: "number", description: "Percentage drop expected" },
                  affected_days: { type: "number" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  description: { type: "string" }
                }
              }
            },
            weekly_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "string" },
                  expected_avg_attendance: { type: "number" },
                  risk_level: { type: "string" },
                  key_events: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            overall_risk_score: { type: "number", description: "1-10 scale" }
          }
        }
      });

      setEventPredictions(response);
    } catch (error) {
      console.error("Error generating predictions:", error);
    }
    setIsPredicting(false);
  };

  const generateStudentRiskAnalysis = async () => {
    if (students.length === 0) {
      alert("Please select a batch first");
      return;
    }
    
    setIsPredicting(true);
    try {
      // Prepare student data for analysis
      const studentSummary = students.map(s => ({
        name: s.name,
        roll_no: s.roll_no,
        attendance: s.attendancePercent,
        academic_performance: s.avgPerformance,
        total_absences: s.absentClasses,
        total_classes: s.totalClasses
      }));

      const prompt = `You are an educational risk assessment AI. Analyze each student's absenteeism risk and predict academic impact.

Student Data:
${JSON.stringify(studentSummary, null, 2)}

For EACH student, analyze:
1. Current attendance pattern and trend
2. Risk of chronic absenteeism (missing >10% classes)
3. Predicted academic impact based on attendance correlation
4. Early warning signs
5. Personalized intervention recommendations

Consider:
- Students below 75% attendance are at high risk
- Strong correlation between attendance and academic performance
- Pattern of absences (consecutive vs sporadic)
- Performance trajectory

Provide actionable insights for each student.`;

      const response = await InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_batch_risk: { type: "string" },
            at_risk_count: { type: "number" },
            student_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  student_name: { type: "string" },
                  roll_no: { type: "string" },
                  risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  risk_score: { type: "number", description: "1-100" },
                  predicted_final_attendance: { type: "number" },
                  predicted_academic_impact: { type: "string" },
                  predicted_grade_drop: { type: "string" },
                  warning_signs: { type: "array", items: { type: "string" } },
                  intervention_priority: { type: "string", enum: ["immediate", "soon", "monitor", "none"] },
                  recommendations: { type: "array", items: { type: "string" } }
                }
              }
            },
            batch_recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setStudentRisks(response);
    } catch (error) {
      console.error("Error analyzing student risks:", error);
    }
    setIsPredicting(false);
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'festival': return '🎉';
      case 'holiday': return '🏛️';
      case 'college_event': return '🎓';
      case 'exam': return '📝';
      case 'weather': return '🌧️';
      default: return '📅';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            Predictive Attendance Analysis
          </h1>
          <p className="text-gray-600 mt-1">AI-powered predictions for attendance patterns and student risk assessment</p>
        </div>

        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-white shadow-md p-1 rounded-xl">
            <TabsTrigger value="events" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg px-6">
              <Calendar className="w-4 h-4 mr-2" />
              Event-Based Predictions
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg px-6">
              <Users className="w-4 h-4 mr-2" />
              Student Risk Analysis
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg px-6">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Advanced Analysis
            </TabsTrigger>
          </TabsList>

          {/* Event-Based Predictions Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card className="shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Predict Attendance Based on Events & Festivals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Prediction Period</Label>
                    <Select value={predictionPeriod} onValueChange={setPredictionPeriod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1month">Next 1 Month</SelectItem>
                        <SelectItem value="2months">Next 2 Months</SelectItem>
                        <SelectItem value="3months">Next 3 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Custom Event (Optional)</Label>
                    <Input 
                      placeholder="e.g., College Annual Day on 15th Feb, Technical Fest..."
                      value={customEvent}
                      onChange={(e) => setCustomEvent(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <Button 
                  onClick={generateEventPredictions}
                  disabled={isPredicting}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {isPredicting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Events...</>
                  ) : (
                    <><Brain className="w-4 h-4 mr-2" /> Generate Predictions</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {eventPredictions && (
              <>
                {/* Summary Card */}
                <Card className="shadow-lg border-l-4 border-purple-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">📊 Prediction Summary</h3>
                        <p className="text-gray-700">{eventPredictions.summary}</p>
                      </div>
                      <div className="text-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white px-6 py-4 rounded-xl">
                        <div className="text-3xl font-bold">{eventPredictions.overall_risk_score}/10</div>
                        <div className="text-sm opacity-90">Risk Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Predicted Events */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Upcoming Events & Expected Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {eventPredictions.predicted_events?.map((event, idx) => (
                        <div 
                          key={idx} 
                          className={`border-l-4 rounded-lg p-4 ${getSeverityColor(event.severity)}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{getEventIcon(event.event_type)}</span>
                                <h4 className="font-bold text-gray-900">{event.event_name}</h4>
                                <Badge className={getRiskColor(event.severity)}>{event.severity}</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" /> {event.event_date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" /> {event.affected_days} days affected
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600">-{event.expected_attendance_drop}%</div>
                              <div className="text-xs text-gray-500">Expected Drop</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Predictions */}
                {eventPredictions.weekly_predictions && (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-purple-600" />
                        Weekly Attendance Forecast
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {eventPredictions.weekly_predictions.map((week, idx) => (
                          <div key={idx} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border">
                            <div className="text-sm font-medium text-gray-600 mb-2">{week.week}</div>
                            <div className="text-3xl font-bold text-gray-900 mb-1">{week.expected_avg_attendance}%</div>
                            <Badge className={getRiskColor(week.risk_level)}>{week.risk_level} risk</Badge>
                            {week.key_events && (
                              <div className="text-xs text-gray-500 mt-2">{week.key_events}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {eventPredictions.recommendations && (
                  <Card className="shadow-lg border-2 border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Target className="w-5 h-5" />
                        Recommendations for Administration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ul className="space-y-3">
                        {eventPredictions.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <ChevronRight className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Student Risk Analysis Tab */}
          <TabsContent value="students" className="space-y-6">
            <Card className="shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Individual Student Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Select Batch *</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.batch_id}>
                            {batch.batch_name} ({batch.college_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={generateStudentRiskAnalysis}
                      disabled={isPredicting || !selectedBatch}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      {isPredicting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Students...</>
                      ) : (
                        <><Brain className="w-4 h-4 mr-2" /> Analyze Student Risks</>
                      )}
                    </Button>
                  </div>
                </div>
                
                {students.length > 0 && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      📊 Loaded {students.length} students from selected batch. Click "Analyze Student Risks" to generate predictions.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {studentRisks?.student_analysis && (
              <>
                {/* Batch Overview */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                    <CardContent className="p-6 text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <div className="text-3xl font-bold">{students.length}</div>
                      <div className="text-sm opacity-90">Total Students</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
                    <CardContent className="p-6 text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <div className="text-3xl font-bold">{studentRisks.at_risk_count}</div>
                      <div className="text-sm opacity-90">At-Risk Students</div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-lg bg-gradient-to-br from-yellow-500 to-amber-500 text-white">
                    <CardContent className="p-6 text-center">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-80" />
                      <div className="text-lg font-bold">{studentRisks.overall_batch_risk}</div>
                      <div className="text-sm opacity-90">Batch Risk Level</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Student Risk Cards */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      Individual Student Risk Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {studentRisks.student_analysis
                        .sort((a, b) => b.risk_score - a.risk_score)
                        .map((student, idx) => (
                        <div 
                          key={idx} 
                          className={`border rounded-xl p-4 ${
                            student.risk_level === 'critical' ? 'border-red-300 bg-red-50' :
                            student.risk_level === 'high' ? 'border-orange-300 bg-orange-50' :
                            student.risk_level === 'moderate' ? 'border-yellow-300 bg-yellow-50' :
                            'border-green-300 bg-green-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-gray-900">{student.student_name}</h4>
                                <Badge variant="outline">{student.roll_no}</Badge>
                                <Badge className={getRiskColor(student.risk_level)}>{student.risk_level}</Badge>
                                {student.intervention_priority === 'immediate' && (
                                  <Badge className="bg-red-600 text-white animate-pulse">⚠️ Immediate Action</Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold" style={{
                                color: student.risk_score > 70 ? '#ef4444' : 
                                       student.risk_score > 50 ? '#f59e0b' : 
                                       student.risk_score > 30 ? '#eab308' : '#22c55e'
                              }}>
                                {student.risk_score}%
                              </div>
                              <div className="text-xs text-gray-500">Risk Score</div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 mb-3">
                            <div className="bg-white/60 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Predicted Final Attendance</div>
                              <div className="text-xl font-bold text-gray-900">{student.predicted_final_attendance}%</div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Academic Impact</div>
                              <div className="text-sm font-semibold text-gray-900">{student.predicted_academic_impact}</div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-3">
                              <div className="text-sm text-gray-600">Predicted Grade Drop</div>
                              <div className="text-lg font-bold text-red-600">{student.predicted_grade_drop}</div>
                            </div>
                          </div>

                          {student.warning_signs?.length > 0 && (
                            <div className="mb-3">
                              <div className="text-sm font-semibold text-gray-700 mb-1">⚠️ Warning Signs:</div>
                              <div className="flex flex-wrap gap-2">
                                {student.warning_signs.map((sign, i) => (
                                  <Badge key={i} variant="outline" className="bg-white/80">{sign}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {student.recommendations?.length > 0 && (
                            <div className="bg-white/80 rounded-lg p-3">
                              <div className="text-sm font-semibold text-green-700 mb-1">💡 Recommendations:</div>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {student.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <ChevronRight className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Batch Recommendations */}
                {studentRisks.batch_recommendations && (
                  <Card className="shadow-lg border-2 border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Target className="w-5 h-5" />
                        Batch-Level Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ul className="space-y-3">
                        {studentRisks.batch_recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Advanced Analysis Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="shadow-xl border-2 border-purple-100">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Upload Attendance File for Advanced Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-gray-600">Upload a CSV file with student attendance data to generate comprehensive analysis reports with charts and insights.</p>
                <div
                  onClick={() => document.getElementById('attendance-file-upload')?.click()}
                  className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-gradient-to-br from-purple-50 to-blue-50"
                >
                  <input
                    id="attendance-file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setAttendanceFile(e.target.files[0])}
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {attendanceFile ? attendanceFile.name : "Drop your attendance CSV here"}
                  </h3>
                  <p className="text-gray-600 text-sm">Supports CSV files with columns: Roll No, Student Name, Total Days, Days Present, Days Absent, Attendance %</p>
                  <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
                
                <Button 
                  onClick={() => window.open('/AdvancedAnalysis', '_blank')}
                  disabled={!attendanceFile}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Advanced Analysis Report
                </Button>
                
                <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    📊 Advanced Analysis Features:
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li className="flex items-center gap-2">✨ <strong>Stunning animated HTML reports</strong></li>
                    <li className="flex items-center gap-2">📈 <strong>Interactive Google Charts</strong> - attendance trends, distributions</li>
                    <li className="flex items-center gap-2">👥 <strong>Student-wise performance</strong> analysis with rankings</li>
                    <li className="flex items-center gap-2">🏆 <strong>Top performers showcase</strong> with animations</li>
                    <li className="flex items-center gap-2">⚠️ <strong>At-risk students identification</strong> (below 75%)</li>
                    <li className="flex items-center gap-2">🤖 <strong>AI-powered insights</strong> and recommendations</li>
                    <li className="flex items-center gap-2">📊 <strong>Comprehensive statistics</strong> and metrics</li>
                    <li className="flex items-center gap-2">🎨 <strong>Professional design</strong> ready to share</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}