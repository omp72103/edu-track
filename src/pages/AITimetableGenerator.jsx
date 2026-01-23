import React, { useState, useEffect } from "react";
import { TimeTable, Batch, Faculty } from "@/entities/all";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Calendar, Wand2, CheckCircle, AlertCircle, ShoppingCart, Download, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AITimetableGenerator() {
  const [cart, setCart] = useState([]);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [batches, setBatches] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [finalTimetable, setFinalTimetable] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState(null);
  const [timetableStructure, setTimetableStructure] = useState({
    working_days: "5",
    start_time: "09:00",
    end_time: "17:00",
    lecture_duration: "60",
    breaks: [
      { name: "Recess", start_time: "11:00", duration: "15" },
      { name: "Lunch", start_time: "13:00", duration: "60" }
    ]
  });
  const [subjectData, setSubjectData] = useState([]);

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
    setSubjectData([...subjectData, { name: "", lectures_per_week: "", type: "Theory", faculty_name: "" }]);
  };

  const updateSubject = (index, field, value) => {
    const updated = [...subjectData];
    updated[index][field] = value;
    setSubjectData(updated);
  };

  const removeSubject = (index) => {
    setSubjectData(subjectData.filter((_, i) => i !== index));
  };

  const addBreak = () => {
    setTimetableStructure({
      ...timetableStructure,
      breaks: [...timetableStructure.breaks, { name: "", start_time: "", duration: "" }]
    });
  };

  const updateBreak = (index, field, value) => {
    const updated = [...timetableStructure.breaks];
    updated[index][field] = value;
    setTimetableStructure({ ...timetableStructure, breaks: updated });
  };

  const removeBreak = (index) => {
    setTimetableStructure({
      ...timetableStructure,
      breaks: timetableStructure.breaks.filter((_, i) => i !== index)
    });
  };

  const addToCart = () => {
    if (!selectedBatch || subjectData.length === 0) {
      setMessage({ type: "error", text: "Please select batch and add subjects" });
      return;
    }

    const batch = batches.find(b => b.id === selectedBatch);
    const cartItem = {
      id: Date.now(),
      batch: batch,
      subjects: [...subjectData],
      structure: { ...timetableStructure }
    };

    setCart([...cart, cartItem]);
    setSubjectData([]);
    setSelectedBatch("");
    setMessage({ type: "success", text: `${batch.batch_name} queued successfully!` });
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const generateFinalTimetable = async () => {
    if (cart.length === 0) {
      setMessage({ type: "error", text: "Queue is empty. Add batches first." });
      return;
    }

    setIsGenerating(true);
    setMessage({ type: "info", text: "Generating timetable... This may take a moment." });

    try {
      const allEntries = [];

      for (const item of cart) {
        const facultyMapping = item.subjects
          .filter(s => s.faculty_name)
          .map(s => `${s.faculty_name} teaches ${s.name}`)
          .join("\n");

        const subjectsList = item.subjects.map(s =>
          `${s.name} (${s.lectures_per_week} lectures/week, ${s.type})`
        ).join("\n");

        const breaksInfo = item.structure.breaks.map(b =>
          `${b.name}: ${b.start_time} for ${b.duration} minutes`
        ).join("\n");

        const prompt = `Generate an optimized timetable for ${item.batch.batch_name}.

STRUCTURE:
- Working Days: ${item.structure.working_days} days (Mon-${item.structure.working_days === "5" ? "Fri" : "Sat"})
- Start Time: ${item.structure.start_time}
- End Time: ${item.structure.end_time}
- Lecture Duration: ${item.structure.lecture_duration} minutes
- Breaks: ${breaksInfo}

SUBJECTS:
${subjectsList}

FACULTY:
${facultyMapping}

RULES:
1. No faculty conflicts across ALL batches
2. Exact weekly lecture allocation
3. Balance workload
4. No heavy subjects after breaks
5. Rooms: Theory (301-320), Lab (Lab1-Lab5)

Generate valid JSON for ALL lectures:`;

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

        const entries = (result.timetable || []).map(e => ({
          ...e,
          batch_id: item.batch.batch_id,
          batch_name: item.batch.batch_name
        }));

        allEntries.push(...entries);
      }

      setFinalTimetable(allEntries);
      
      // Automatically save to database
      await saveToDatabaseAuto(allEntries);
      
      setMessage({ type: "success", text: "Timetable generated and saved successfully! View it in Timetable section." });
    } catch (error) {
      console.error("Error generating timetable:", error);
      setMessage({ type: "error", text: "Failed to generate timetable" });
    }

    setIsGenerating(false);
  };

  const saveToDatabaseAuto = async (entries) => {
    try {
      for (const entry of entries) {
        const batch = batches.find(b => b.batch_id === entry.batch_id);
        const faculty = faculties.find(f => f.name === entry.faculty_name) || faculties[0];

        await TimeTable.create({
          batch_id: entry.batch_id,
          college_name: batch?.college_name || "",
          year: batch?.year || "",
          branch: batch?.branch || "",
          division: batch?.division || "",
          day_of_week: entry.day_of_week,
          time_slot: entry.time_slot,
          subject: entry.subject,
          faculty_name: entry.faculty_name,
          faculty_email: faculty?.email || "",
          room_number: entry.room_number,
          class_type: entry.class_type,
          academic_year: "2025-26"
        });
      }
    } catch (error) {
      console.error("Error auto-saving to database:", error);
    }
  };

  const downloadPDF = () => {
    if (!finalTimetable || finalTimetable.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const groupedByBatch = finalTimetable.reduce((acc, entry) => {
      if (!acc[entry.batch_name]) acc[entry.batch_name] = [];
      acc[entry.batch_name].push(entry);
      return acc;
    }, {});

    let pageNum = 0;

    Object.entries(groupedByBatch).forEach(([batchName, entries]) => {
      if (pageNum > 0) doc.addPage();
      pageNum++;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text(`Timetable - ${batchName}`, 148, 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      // Group by day
      const groupedByDay = {};
      daysOfWeek.forEach(day => {
        groupedByDay[day] = entries.filter(e => e.day_of_week === day).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
      });

      // Draw table manually
      let y = 25;
      const colWidth = 30;
      const rowHeight = 25;
      const startX = 10;

      // Header row
      doc.setFillColor(220, 220, 255);
      doc.rect(startX, y, 25, rowHeight, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('Day', startX + 12, y + 5, { align: 'center' });
      
      for (let i = 0; i < 8; i++) {
        doc.rect(startX + 25 + i * colWidth, y, colWidth, rowHeight, 'F');
        doc.text(`Slot ${i + 1}`, startX + 25 + i * colWidth + 15, y + 5, { align: 'center' });
      }
      
      y += rowHeight;

      // Data rows
      doc.setFont(undefined, 'normal');
      daysOfWeek.forEach(day => {
        const dayEntries = groupedByDay[day] || [];
        if (dayEntries.length > 0) {
          doc.setFillColor(240, 240, 255);
          doc.rect(startX, y, 25, rowHeight, 'FD');
          doc.setFont(undefined, 'bold');
          doc.text(day.substring(0, 3), startX + 12, y + 8, { align: 'center' });
          doc.setFont(undefined, 'normal');

          for (let i = 0; i < 8; i++) {
            const entry = dayEntries[i];
            doc.rect(startX + 25 + i * colWidth, y, colWidth, rowHeight, 'D');
            
            if (entry) {
              doc.setFontSize(7);
              doc.text(entry.subject.substring(0, 15), startX + 25 + i * colWidth + 2, y + 5);
              doc.setFontSize(6);
              doc.text(entry.faculty_name.substring(0, 12), startX + 25 + i * colWidth + 2, y + 10);
              doc.text(entry.time_slot, startX + 25 + i * colWidth + 2, y + 14);
              doc.text(entry.room_number, startX + 25 + i * colWidth + 2, y + 18);
              doc.setFontSize(8);
            }
          }
          y += rowHeight;
        }
      });

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by EDU TRACK', 148, 200, { align: 'center' });
    });

    doc.save('Final_Timetable.pdf');
  };

  const saveToDatabaseAll = async () => {
    if (!finalTimetable) return;

    try {
      for (const entry of finalTimetable) {
        const batch = batches.find(b => b.batch_id === entry.batch_id);
        const faculty = faculties.find(f => f.name === entry.faculty_name) || faculties[0];

        await TimeTable.create({
          batch_id: entry.batch_id,
          college_name: batch?.college_name || "",
          year: batch?.year || "",
          branch: batch?.branch || "",
          division: batch?.division || "",
          day_of_week: entry.day_of_week,
          time_slot: entry.time_slot,
          subject: entry.subject,
          faculty_name: entry.faculty_name,
          faculty_email: faculty?.email || "",
          room_number: entry.room_number,
          class_type: entry.class_type,
          academic_year: "2025-26"
        });
      }

      setMessage({ type: "success", text: "All timetables saved to database!" });
      setFinalTimetable(null);
      setCart([]);
    } catch (error) {
      console.error("Error saving:", error);
      setMessage({ type: "error", text: "Failed to save timetables" });
    }
  };

  const groupByDayAndBatch = (entries) => {
    const grouped = {};
    entries.forEach(entry => {
      if (!grouped[entry.batch_name]) grouped[entry.batch_name] = {};
      if (!grouped[entry.batch_name][entry.day_of_week]) {
        grouped[entry.batch_name][entry.day_of_week] = [];
      }
      grouped[entry.batch_name][entry.day_of_week].push(entry);
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
          <p className="text-gray-600 mt-2">Configure batches, queue them, and generate a smart class schedule</p>
        </div>

        {message && (
          <Alert className={message.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Configuration Form */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100">
                <CardTitle>📚 Configure Batch Timetable</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Batch Selection */}
                <div>
                  <Label className="text-lg font-semibold">Select Batch *</Label>
                  <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Choose batch (SY, TY, etc.)" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batch_name} - {b.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Timetable Structure */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">⏰ Timetable Structure</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Working Days</Label>
                      <Select value={timetableStructure.working_days} onValueChange={(v) => setTimetableStructure({ ...timetableStructure, working_days: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 Days (Mon-Fri)</SelectItem>
                          <SelectItem value="6">6 Days (Mon-Sat)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Lecture Duration (mins)</Label>
                      <Input type="number" value={timetableStructure.lecture_duration} onChange={(e) => setTimetableStructure({ ...timetableStructure, lecture_duration: e.target.value })} />
                    </div>
                    <div>
                      <Label>Start Time</Label>
                      <Input type="time" value={timetableStructure.start_time} onChange={(e) => setTimetableStructure({ ...timetableStructure, start_time: e.target.value })} />
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Input type="time" value={timetableStructure.end_time} onChange={(e) => setTimetableStructure({ ...timetableStructure, end_time: e.target.value })} />
                    </div>
                  </div>

                  {/* Breaks */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label>Breaks (Recess, Lunch, etc.)</Label>
                      <Button size="sm" variant="outline" onClick={addBreak}>
                        <Plus className="w-3 h-3 mr-1" /> Add Break
                      </Button>
                    </div>
                    {timetableStructure.breaks.map((brk, idx) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                        <Input placeholder="Name" value={brk.name} onChange={(e) => updateBreak(idx, 'name', e.target.value)} />
                        <Input type="time" value={brk.start_time} onChange={(e) => updateBreak(idx, 'start_time', e.target.value)} />
                        <Input type="number" placeholder="Duration (mins)" value={brk.duration} onChange={(e) => updateBreak(idx, 'duration', e.target.value)} />
                        <Button size="sm" variant="destructive" onClick={() => removeBreak(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subjects */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <Label className="text-lg font-semibold">📖 Subjects</Label>
                    <Button size="sm" variant="outline" onClick={addSubject}>
                      <Plus className="w-4 h-4 mr-1" /> Add Subject
                    </Button>
                  </div>
                  {subjectData.map((subject, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50 mb-2">
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        <Input placeholder="Subject Name" value={subject.name} onChange={(e) => updateSubject(index, 'name', e.target.value)} />
                        <Input type="number" placeholder="Lectures/Week" value={subject.lectures_per_week} onChange={(e) => updateSubject(index, 'lectures_per_week', e.target.value)} />
                        <Select value={subject.type} onValueChange={(v) => updateSubject(index, 'type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Theory">Theory</SelectItem>
                            <SelectItem value="Practical">Practical</SelectItem>
                            <SelectItem value="Lab">Lab</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={subject.faculty_name} onValueChange={(v) => updateSubject(index, 'faculty_name', v)}>
                          <SelectTrigger><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                          <SelectContent>
                            {faculties.map(f => (
                              <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => removeSubject(index)}>Remove</Button>
                    </div>
                  ))}
                </div>

                <Button onClick={addToCart} className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                  <Calendar className="w-4 h-4 mr-2" />
                  Add to Queue
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div>
            <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-xl sticky top-6">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Queued Batches ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No batches queued yet</p>
                    <p className="text-gray-400 text-xs mt-1">Configure and queue batches to start</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{item.batch.batch_name}</p>
                          <p className="text-xs text-gray-600">{item.subjects.length} subjects</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}

                {cart.length > 0 && (
                  <Button
                    onClick={generateFinalTimetable}
                    disabled={isGenerating}
                    className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl text-lg font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating AI Timetable...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Smart Timetable
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Final Timetable Display */}
        {finalTimetable && finalTimetable.length > 0 && (
          <Card className="backdrop-blur-xl bg-white/90 border-0 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Generated Timetable (Rectangular View)
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-1">Auto-saved to database • View in Timetable section</p>
                </div>
                <Button onClick={downloadPDF} className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {Object.entries(groupByDayAndBatch(finalTimetable)).map(([batchName, days]) => (
                <div key={batchName} className="mb-10">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-t-xl">
                    <h3 className="text-2xl font-bold">{batchName}</h3>
                  </div>
                  <div className="overflow-x-auto border-4 border-purple-300 rounded-b-xl shadow-lg">
                    <table className="w-full border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                          <th className="border-2 border-white px-6 py-4 text-left font-bold text-lg sticky left-0 bg-blue-500 z-10 min-w-[140px]">Day / Time</th>
                          {Array.from({ length: 8 }, (_, i) => (
                            <th key={i} className="border-2 border-white px-4 py-4 text-center font-bold min-w-[160px]">
                              <div className="text-sm">Slot {i + 1}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {daysOfWeek.map(day => {
                          const dayEntries = days[day] || [];
                          if (dayEntries.length === 0) return null;
                          const sorted = dayEntries.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
                          return (
                            <tr key={day} className="hover:bg-blue-50 transition-colors">
                              <td className="border-2 border-gray-300 px-6 py-6 font-bold text-lg bg-gradient-to-r from-purple-100 to-blue-100 sticky left-0 z-10">{day}</td>
                              {Array.from({ length: 8 }, (_, i) => {
                                const entry = sorted[i];
                                if (!entry) return <td key={i} className="border-2 border-gray-300 px-4 py-6 text-center text-gray-400 text-lg">—</td>;
                                return (
                                  <td key={i} className="border-2 border-gray-300 px-4 py-4 bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-all">
                                    <div className="text-center space-y-1">
                                      <div className="font-bold text-purple-900 text-sm leading-tight">{entry.subject}</div>
                                      <div className="text-xs text-indigo-600 font-semibold">{entry.time_slot}</div>
                                      <div className="text-xs text-gray-700 font-medium">{entry.faculty_name}</div>
                                      <div className="text-xs text-gray-500">{entry.room_number}</div>
                                      <Badge className="mt-1 text-xs bg-blue-500 text-white px-2 py-0.5 font-medium">{entry.class_type}</Badge>
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
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}