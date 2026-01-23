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
  const [step, setStep] = useState(1);
  const [academicYear, setAcademicYear] = useState("");
  const [batches, setBatches] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [timetableStructure, setTimetableStructure] = useState({
    working_days: "5",
    lectures_per_day: "6",
    lecture_duration: "60",
    break_duration: "10",
    lunch_start: "13:00",
    lunch_duration: "60",
    start_time: "09:00"
  });
  const [subjectData, setSubjectData] = useState([]);
  const [facultySubjects, setFacultySubjects] = useState({});

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

  const addSubject = () => {
    setSubjectData([...subjectData, { name: "", lectures_per_week: "", type: "Theory" }]);
  };

  const updateSubject = (index, field, value) => {
    const updated = [...subjectData];
    updated[index][field] = value;
    setSubjectData(updated);
  };

  const removeSubject = (index) => {
    setSubjectData(subjectData.filter((_, i) => i !== index));
  };

  const generateTimetable = async () => {
    if (!selectedBatch || subjectData.length === 0) {
      setMessage({ type: "error", text: "Please complete all steps before generating" });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const batch = batches.find(b => b.id === selectedBatch);
      
      if (!batch) {
        setMessage({ type: "error", text: "Selected batch not found" });
        setIsGenerating(false);
        return;
      }
      
      // Build faculty-subject mapping
      const facultyMapping = Object.entries(facultySubjects)
        .filter(([_, subjects]) => subjects.length > 0)
        .map(([facultyName, subjects]) => `${facultyName} teaches: ${subjects.join(", ")}`)
        .join("\n");
      
      const subjectsList = subjectData.map(s => 
        `${s.name} (${s.lectures_per_week} lectures/week, ${s.type})`
      ).join("\n");
      
      const prompt = `You are an intelligent academic timetable generation system. Generate an optimized, conflict-free class timetable.

📚 ACADEMIC DATA:
Batch: ${batch.batch_name}
Academic Year: ${academicYear}
College: ${batch.college_name}

🏗 TIMETABLE STRUCTURE:
- Working Days: ${timetableStructure.working_days} days per week (${timetableStructure.working_days === "5" ? "Mon-Fri" : "Mon-Sat"})
- Lectures Per Day: ${timetableStructure.lectures_per_day}
- Lecture Duration: ${timetableStructure.lecture_duration} minutes
- Start Time: ${timetableStructure.start_time}
- Lunch Break: ${timetableStructure.lunch_start} for ${timetableStructure.lunch_duration} minutes

📖 SUBJECTS & REQUIREMENTS:
${subjectsList}

👨‍🏫 FACULTY-SUBJECT MAPPING:
${facultyMapping}

🧠 ALLOCATION RULES:
1. No faculty can be assigned to two classes at the same time
2. Each subject must receive EXACTLY the required number of weekly slots
3. Faculty workload must be evenly distributed across the week
4. Avoid subject repetition on the same day if possible
5. Balance difficult subjects across the week
6. No heavy subjects immediately after lunch
7. Theory classes in rooms 301-320, Lab/Practical classes in Lab1-Lab5

⭐ OPTIMIZATION GOALS:
- Minimize faculty idle time
- Ensure no faculty clashes
- Balance student cognitive load
- Create a professional, conflict-free schedule

Generate ONLY valid JSON with this structure for ALL lectures across ALL working days:

`;

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
    <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-purple-600" />
            AI Timetable Generator
          </h1>
          <p className="text-gray-600 mt-2">Intelligent academic timetable generation with conflict-free scheduling</p>
        </div>

        {/* Progress Steps */}
        <Card className="backdrop-blur-xl bg-white/80 border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: "Academic Year" },
                { num: 2, label: "Timetable Structure" },
                { num: 3, label: "Subjects & Faculty" },
                { num: 4, label: "Generate" }
              ].map((s, i) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      step >= s.num ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {s.num}
                    </div>
                    <span className="text-xs mt-2 font-semibold">{s.label}</span>
                  </div>
                  {i < 3 && <div className={`flex-1 h-1 mx-4 ${step > s.num ? 'bg-gradient-to-r from-purple-600 to-blue-600' : 'bg-gray-200'}`}></div>}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {message && (
          <Alert className={message.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: Academic Year */}
        {step === 1 && (
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
              <CardTitle>🎯 Step 1: Select Academic Year</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-lg font-semibold">Academic Year *</Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Year">First Year</SelectItem>
                    <SelectItem value="Second Year">Second Year</SelectItem>
                    <SelectItem value="Third Year">Third Year</SelectItem>
                    <SelectItem value="Final Year">Final Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-lg font-semibold">Select Batch/Division *</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Choose batch" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.filter(b => !academicYear || b.year === academicYear).map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.batch_name} - {b.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={() => setStep(2)} 
                disabled={!academicYear || !selectedBatch}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-12 text-base"
              >
                Next: Timetable Structure →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Timetable Structure */}
        {step === 2 && (
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
              <CardTitle>🏗 Step 2: Define Timetable Structure</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Working Days per Week *</Label>
                <Select value={timetableStructure.working_days} onValueChange={(value) => setTimetableStructure({...timetableStructure, working_days: value})}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Days (Monday to Friday)</SelectItem>
                    <SelectItem value="6">6 Days (Monday to Saturday)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Lectures Per Day *</Label>
                  <Input 
                    type="number" 
                    min="4" 
                    max="8" 
                    value={timetableStructure.lectures_per_day} 
                    onChange={(e) => setTimetableStructure({...timetableStructure, lectures_per_day: e.target.value})} 
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <Label>Lecture Duration (mins) *</Label>
                  <Input 
                    type="number" 
                    value={timetableStructure.lecture_duration} 
                    onChange={(e) => setTimetableStructure({...timetableStructure, lecture_duration: e.target.value})} 
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input 
                    type="time" 
                    value={timetableStructure.start_time} 
                    onChange={(e) => setTimetableStructure({...timetableStructure, start_time: e.target.value})} 
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <Label>Lunch Start *</Label>
                  <Input 
                    type="time" 
                    value={timetableStructure.lunch_start} 
                    onChange={(e) => setTimetableStructure({...timetableStructure, lunch_start: e.target.value})} 
                    className="h-12 text-base"
                  />
                </div>
                <div>
                  <Label>Lunch Duration (mins) *</Label>
                  <Input 
                    type="number" 
                    value={timetableStructure.lunch_duration} 
                    onChange={(e) => setTimetableStructure({...timetableStructure, lunch_duration: e.target.value})} 
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                  ← Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 h-12">
                  Next: Subjects & Faculty →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Subjects & Faculty */}
        {step === 3 && (
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
              <CardTitle>📚 Step 3: Define Subjects & Faculty Assignment</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ Add all subjects and assign faculty members. The system will ensure no faculty conflicts and optimal workload distribution.
                </p>
              </div>

              <div className="space-y-3">
                {subjectData.map((subject, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="col-span-2">
                        <Label>Subject Name</Label>
                        <Input 
                          value={subject.name} 
                          onChange={(e) => updateSubject(index, 'name', e.target.value)} 
                          placeholder="e.g., Data Structures"
                        />
                      </div>
                      <div>
                        <Label>Lectures/Week</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          max="10" 
                          value={subject.lectures_per_week} 
                          onChange={(e) => updateSubject(index, 'lectures_per_week', e.target.value)} 
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select value={subject.type} onValueChange={(value) => updateSubject(index, 'type', value)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Theory">Theory</SelectItem>
                            <SelectItem value="Practical">Practical</SelectItem>
                            <SelectItem value="Lab">Lab</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeSubject(index)}>
                      Remove Subject
                    </Button>
                  </div>
                ))}
              </div>

              <Button onClick={addSubject} variant="outline" className="w-full">
                + Add Subject
              </Button>

              <div className="border-t pt-4">
                <Label className="text-lg font-semibold mb-3 block">Assign Faculty to Subjects</Label>
                {faculties.map(faculty => (
                  <div key={faculty.id} className="mb-3">
                    <Label className="text-sm font-semibold">{faculty.name}</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {subjectData.map((subject, idx) => (
                        <Badge 
                          key={idx}
                          className={`cursor-pointer ${
                            facultySubjects[faculty.name]?.includes(subject.name) 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-200 text-gray-700'
                          }`}
                          onClick={() => {
                            const current = facultySubjects[faculty.name] || [];
                            const updated = current.includes(subject.name)
                              ? current.filter(s => s !== subject.name)
                              : [...current, subject.name];
                            setFacultySubjects({...facultySubjects, [faculty.name]: updated});
                          }}
                        >
                          {subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">
                  ← Back
                </Button>
                <Button 
                  onClick={() => setStep(4)} 
                  disabled={subjectData.length === 0}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 h-12"
                >
                  Next: Generate Timetable →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Generate */}
        {step === 4 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
                <CardTitle>⚡ Step 4: Generate Optimized Timetable</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-green-900">Ready to Generate:</h4>
                  <p className="text-sm text-green-700">✓ Academic Year: {academicYear}</p>
                  <p className="text-sm text-green-700">✓ Batch: {batches.find(b => b.id === selectedBatch)?.batch_name || "Not selected"}</p>
                  <p className="text-sm text-green-700">✓ Subjects: {subjectData.length}</p>
                  <p className="text-sm text-green-700">✓ Working Days: {timetableStructure.working_days}</p>
                  <p className="text-sm text-green-700">✓ Lectures/Day: {timetableStructure.lectures_per_day}</p>
                </div>

                <Button 
                  onClick={generateTimetable} 
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-14 text-lg"
                >
                  {isGenerating ? (
                    <>🔄 Generating Optimized Timetable...</>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      🚀 Generate AI-Powered Timetable
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={() => setStep(3)} className="w-full h-12">
                  ← Back to Subjects
                </Button>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <CardTitle>📋 Preview & Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {!generatedTimetable ? (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click generate to create your optimized timetable</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">✅ Timetable Generated!</h3>
                      <p className="text-sm text-green-700">Batch: {generatedTimetable.batch_name}</p>
                      <p className="text-sm text-green-700">Total Classes: {generatedTimetable.entries.length}</p>
                      <p className="text-sm text-green-700">Days Covered: {Object.keys(groupByDay(generatedTimetable.entries)).filter(day => groupByDay(generatedTimetable.entries)[day].length > 0).length}</p>
                    </div>
                    
                    <Button 
                      onClick={saveTimetable} 
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-12 text-base"
                    >
                      {isSaving ? "💾 Saving..." : "💾 Save to Database"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {generatedTimetable && (
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <CardTitle className="text-2xl">📅 Generated Timetable{generatedTimetable.batch_name ? ` - ${generatedTimetable.batch_name}` : ''}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-100 to-blue-100">
                      <th className="border border-gray-300 px-4 py-3 text-left font-bold">Day / Time</th>
                      {Array.from({ length: parseInt(timetableStructure.lectures_per_day) }, (_, i) => (
                        <th key={i} className="border border-gray-300 px-4 py-3 text-center font-bold">
                          Lecture {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupByDay(generatedTimetable.entries)).map(([day, entries]) => {
                      if (entries.length === 0) return null;
                      return (
                        <tr key={day} className="hover:bg-purple-50 transition-colors">
                          <td className="border border-gray-300 px-4 py-3 font-bold bg-purple-50">{day}</td>
                          {Array.from({ length: parseInt(timetableStructure.lectures_per_day) }, (_, i) => {
                            const entry = entries[i];
                            if (!entry) return <td key={i} className="border border-gray-300 px-4 py-3 text-center text-gray-400">-</td>;
                            
                            return (
                              <td key={i} className="border border-gray-300 px-3 py-3">
                                <div className="text-center">
                                  <div className="font-semibold text-purple-900 text-sm">{entry.subject}</div>
                                  <div className="text-xs text-gray-600">{entry.faculty_name}</div>
                                  <div className="text-xs text-gray-500">{entry.room_number}</div>
                                  <Badge className="mt-1 text-xs bg-blue-100 text-blue-800">{entry.class_type}</Badge>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Review the generated timetable carefully. Ensure no faculty conflicts and all subjects are properly allocated before saving.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}