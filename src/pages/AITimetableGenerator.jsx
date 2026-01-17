import React, { useState, useEffect } from "react";
import { TimeTable, Batch, Faculty } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Calendar, Wand2, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AITimetableGenerator() {
  const [batches, setBatches] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [preferences, setPreferences] = useState({
    start_time: "09:00",
    end_time: "17:00",
    class_duration: "60",
    break_duration: "10",
    lunch_start: "13:00",
    lunch_duration: "60",
    subjects: "",
    working_days: "5"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [batchData, facultyData] = await Promise.all([
        Batch.list(),
        Faculty.list()
      ]);
      setBatches(batchData);
      setFaculties(facultyData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const generateTimetable = async () => {
    if (!selectedBatch) {
      setMessage({ type: "error", text: "Please select a batch" });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const batch = batches.find(b => b.id === selectedBatch);
      const facultyList = faculties.map(f => `${f.name} (${f.department || "General"})`).join(", ");
      
      const prompt = `Generate an optimized weekly timetable for the following:

Batch: ${batch.batch_name}
College: ${batch.college_name}
Year: ${batch.year}

Available Faculty: ${facultyList}

Preferences:
- Start Time: ${preferences.start_time}
- End Time: ${preferences.end_time}
- Class Duration: ${preferences.class_duration} minutes
- Break Duration: ${preferences.break_duration} minutes
- Lunch Break: ${preferences.lunch_start} for ${preferences.lunch_duration} minutes
- Working Days: ${preferences.working_days} days per week
- Subjects: ${preferences.subjects || "Computer Science, Mathematics, Physics, Chemistry, English, Data Structures, Programming"}

Requirements:
1. Optimize to avoid faculty clashes
2. Balance workload across days
3. Include theory, practical, and tutorial sessions
4. Assign appropriate rooms (301-320 for theory, Lab1-Lab5 for practicals)
5. Consider student fatigue (no heavy subjects after lunch)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "day_of_week": "Monday",
    "time_slot": "09:00 AM - 10:00 AM",
    "subject": "Data Structures",
    "faculty_name": "Dr. Smith",
    "room_number": "301",
    "class_type": "Lecture"
  }
]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            timetable: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day_of_week: { type: "string" },
                  time_slot: { type: "string" },
                  subject: { type: "string" },
                  faculty_name: { type: "string" },
                  room_number: { type: "string" },
                  class_type: { type: "string" }
                }
              }
            }
          }
        }
      });

      const timetableData = result.timetable || [];
      
      setGeneratedTimetable({
        batch_id: batch.batch_id,
        batch_name: batch.batch_name,
        entries: timetableData
      });
      
      setMessage({ type: "success", text: "Timetable generated successfully! Review and save." });
    } catch (error) {
      console.error("Error generating timetable:", error);
      setMessage({ type: "error", text: "Failed to generate timetable. Please try again." });
    }

    setIsGenerating(false);
  };

  const saveTimetable = async () => {
    if (!generatedTimetable) return;

    setIsSaving(true);
    try {
      const batch = batches.find(b => b.id === selectedBatch);
      
      // Delete existing timetable for this batch
      const existingEntries = await TimeTable.filter({ batch_id: batch.batch_id });
      for (const entry of existingEntries) {
        await TimeTable.delete(entry.id);
      }

      // Save new timetable
      for (const entry of generatedTimetable.entries) {
        const faculty = faculties.find(f => f.name === entry.faculty_name) || faculties[0];
        
        await TimeTable.create({
          batch_id: batch.batch_id,
          college_name: batch.college_name,
          year: batch.year,
          branch: batch.branch,
          division: batch.division,
          day_of_week: entry.day_of_week,
          time_slot: entry.time_slot,
          subject: entry.subject,
          faculty_name: entry.faculty_name,
          faculty_email: faculty.email,
          room_number: entry.room_number,
          class_type: entry.class_type,
          academic_year: "2025-26"
        });
      }

      setMessage({ type: "success", text: "Timetable saved successfully!" });
      setGeneratedTimetable(null);
    } catch (error) {
      console.error("Error saving timetable:", error);
      setMessage({ type: "error", text: "Failed to save timetable" });
    }
    setIsSaving(false);
  };

  const groupByDay = (entries) => {
    const grouped = {};
    daysOfWeek.forEach(day => {
      grouped[day] = entries.filter(e => e.day_of_week === day).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    });
    return grouped;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            AI Timetable Generator
          </h1>
          <p className="text-gray-600">Auto-generate optimized class schedules using AI</p>
        </div>

        {message && (
          <Alert className={message.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Select Batch *</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger><SelectValue placeholder="Choose a batch"/></SelectTrigger>
                  <SelectContent>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.batch_name} - {b.year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={preferences.start_time} onChange={(e) => setPreferences({...preferences, start_time: e.target.value})} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={preferences.end_time} onChange={(e) => setPreferences({...preferences, end_time: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Class Duration (mins)</Label>
                  <Input type="number" value={preferences.class_duration} onChange={(e) => setPreferences({...preferences, class_duration: e.target.value})} />
                </div>
                <div>
                  <Label>Break Duration (mins)</Label>
                  <Input type="number" value={preferences.break_duration} onChange={(e) => setPreferences({...preferences, break_duration: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lunch Start</Label>
                  <Input type="time" value={preferences.lunch_start} onChange={(e) => setPreferences({...preferences, lunch_start: e.target.value})} />
                </div>
                <div>
                  <Label>Lunch Duration (mins)</Label>
                  <Input type="number" value={preferences.lunch_duration} onChange={(e) => setPreferences({...preferences, lunch_duration: e.target.value})} />
                </div>
              </div>

              <div>
                <Label>Working Days per Week</Label>
                <Select value={preferences.working_days} onValueChange={(value) => setPreferences({...preferences, working_days: value})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Days (Mon-Fri)</SelectItem>
                    <SelectItem value="6">6 Days (Mon-Sat)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subjects (comma-separated)</Label>
                <Input 
                  placeholder="e.g., Math, Physics, Chemistry" 
                  value={preferences.subjects} 
                  onChange={(e) => setPreferences({...preferences, subjects: e.target.value})} 
                />
              </div>

              <Button 
                onClick={generateTimetable} 
                disabled={isGenerating || !selectedBatch}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Timetable
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle>Preview & Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!generatedTimetable ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Configure and generate to see preview</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Generated for: {generatedTimetable.batch_name}</h3>
                    <p className="text-sm text-green-700">Total Classes: {generatedTimetable.entries.length}</p>
                    <p className="text-sm text-green-700">Days: {Object.keys(groupByDay(generatedTimetable.entries)).filter(day => groupByDay(generatedTimetable.entries)[day].length > 0).length}</p>
                  </div>
                  
                  <Button 
                    onClick={saveTimetable} 
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? "Saving..." : "Save Timetable"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {generatedTimetable && (
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle>Generated Timetable Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(groupByDay(generatedTimetable.entries)).map(([day, entries]) => {
                  if (entries.length === 0) return null;
                  return (
                    <div key={day} className="border rounded-lg overflow-hidden">
                      <div className="bg-purple-600 text-white px-4 py-2 font-semibold">{day}</div>
                      <div className="divide-y">
                        {entries.map((entry, idx) => (
                          <div key={idx} className="p-3 flex justify-between items-center">
                            <div>
                              <span className="font-semibold">{entry.time_slot}</span>
                              <p className="text-sm">{entry.subject} - {entry.faculty_name}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">{entry.room_number}</Badge>
                              <Badge className="bg-blue-100 text-blue-800">{entry.class_type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}