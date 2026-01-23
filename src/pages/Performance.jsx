import React, { useState, useEffect } from "react";
import { StudentPerformance, Student, Batch } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Plus, Edit, Trash2, Download, TrendingUp, Award, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ManageStudentEmailsModal from "../components/students/ManageStudentEmailsModal";

const assessmentTypes = ["Internal Test 1", "Internal Test 2", "Internal Test 3", "Assignment", "Project", "Practical", "Final Exam", "Quiz"];
const grades = ["A+", "A", "B+", "B", "C", "D", "F"];

export default function PerformancePage() {
  const [performances, setPerformances] = useState([]);
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState(null);
  const [message, setMessage] = useState(null);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [studentDialog, setStudentDialog] = useState(null);
  
  const [formData, setFormData] = useState({
    student_id: "",
    batch_id: "",
    subject: "",
    assessment_type: "Internal Test 1",
    marks_obtained: "",
    total_marks: "",
    assessment_date: new Date().toISOString().split('T')[0],
    semester: "",
    remarks: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [perfData, studentData, batchData] = await Promise.all([
        StudentPerformance.list("-created_date", 500),
        Student.list(),
        Batch.list()
      ]);
      setPerformances(perfData);
      setStudents(studentData);
      setBatches(batchData);
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: "error", text: "Failed to load data" });
    }
    setIsLoading(false);
  };

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "F";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const student = students.find(s => s.id === formData.student_id);
      const batch = batches.find(b => b.id === formData.batch_id);
      
      if (!student || !batch) {
        setMessage({ type: "error", text: "Please select valid student and batch" });
        return;
      }

      const marksObtained = parseFloat(formData.marks_obtained);
      const totalMarks = parseFloat(formData.total_marks);
      const percentage = (marksObtained / totalMarks) * 100;
      const grade = calculateGrade(percentage);

      const perfData = {
        student_id: student.id,
        student_name: student.name,
        prn: student.prn,
        roll_no: student.roll_no,
        batch_id: batch.batch_id,
        college_name: batch.college_name,
        year: batch.year,
        branch: batch.branch,
        subject: formData.subject,
        assessment_type: formData.assessment_type,
        marks_obtained: marksObtained,
        total_marks: totalMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        grade: grade,
        assessment_date: formData.assessment_date,
        semester: formData.semester,
        remarks: formData.remarks
      };

      if (editingPerformance) {
        await StudentPerformance.update(editingPerformance.id, perfData);
        setMessage({ type: "success", text: "Performance record updated" });
      } else {
        await StudentPerformance.create(perfData);
        setMessage({ type: "success", text: "Performance record added" });
      }

      await loadData();
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving performance:", error);
      setMessage({ type: "error", text: "Failed to save performance record" });
    }
  };

  const handleEdit = (perf) => {
    setEditingPerformance(perf);
    const student = students.find(s => s.id === perf.student_id);
    const batch = batches.find(b => b.batch_id === perf.batch_id);
    
    setFormData({
      student_id: perf.student_id,
      batch_id: batch?.id || "",
      subject: perf.subject,
      assessment_type: perf.assessment_type,
      marks_obtained: perf.marks_obtained.toString(),
      total_marks: perf.total_marks.toString(),
      assessment_date: perf.assessment_date,
      semester: perf.semester || "",
      remarks: perf.remarks || ""
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await StudentPerformance.delete(id);
      setMessage({ type: "success", text: "Record deleted" });
      await loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      setMessage({ type: "error", text: "Failed to delete record" });
    }
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      batch_id: "",
      subject: "",
      assessment_type: "Internal Test 1",
      marks_obtained: "",
      total_marks: "",
      assessment_date: new Date().toISOString().split('T')[0],
      semester: "",
      remarks: ""
    });
    setEditingPerformance(null);
  };

  const exportToCSV = () => {
    const filtered = getFilteredPerformances();
    const headers = ["Student", "Roll No", "Batch", "Subject", "Assessment", "Marks", "Total", "Percentage", "Grade", "Date"];
    const rows = filtered.map(p => [
      p.student_name,
      p.roll_no,
      batches.find(b => b.batch_id === p.batch_id)?.batch_name || p.batch_id,
      p.subject,
      p.assessment_type,
      p.marks_obtained,
      p.total_marks,
      p.percentage + "%",
      p.grade,
      p.assessment_date
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_performance.csv";
    a.click();
  };

  const getFilteredPerformances = () => {
    return performances.filter(p => {
      const batchMatch = !filterBatch || p.batch_id === filterBatch;
      const studentMatch = !filterStudent || p.student_id === filterStudent;
      const searchMatch = !searchTerm || 
        p.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.subject.toLowerCase().includes(searchTerm.toLowerCase());
      return batchMatch && studentMatch && searchMatch;
    });
  };

  const getStudentStats = (studentId) => {
    const studentPerfs = performances.filter(p => p.student_id === studentId);
    if (studentPerfs.length === 0) return null;
    
    const avgPercentage = studentPerfs.reduce((sum, p) => sum + p.percentage, 0) / studentPerfs.length;
    return {
      totalAssessments: studentPerfs.length,
      avgPercentage: avgPercentage.toFixed(2),
      avgGrade: calculateGrade(avgPercentage)
    };
  };

  const filteredStudents = students.filter(s => !filterBatch || s.batch_id === batches.find(b => b.id === filterBatch)?.batch_id);

  const showStudentDialog = (student, stats, perfs) => {
    setStudentDialog({ student, stats, perfs });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Student Performance
            </h1>
            <p className="text-gray-600">Track and manage student academic performance</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowEmailModal(true)} variant="outline" className="gap-2">
              <Mail className="w-4 h-4" />
              Manage Emails
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Dialog open={showAddModal} onOpenChange={(open) => {
              setShowAddModal(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPerformance ? "Edit" : "Add"} Performance Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Batch *</Label>
                      <Select value={formData.batch_id} onValueChange={(value) => {
                        setFormData({...formData, batch_id: value, student_id: ""});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select batch"/></SelectTrigger>
                        <SelectContent>
                          {batches.map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.batch_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Student *</Label>
                      <Select value={formData.student_id} onValueChange={(value) => setFormData({...formData, student_id: value})} disabled={!formData.batch_id}>
                        <SelectTrigger><SelectValue placeholder="Select student"/></SelectTrigger>
                        <SelectContent>
                          {students.filter(s => s.batch_id === batches.find(b => b.id === formData.batch_id)?.batch_id).map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.roll_no})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Subject *</Label>
                      <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Assessment Type *</Label>
                      <Select value={formData.assessment_type} onValueChange={(value) => setFormData({...formData, assessment_type: value})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          {assessmentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Marks Obtained *</Label>
                      <Input type="number" value={formData.marks_obtained} onChange={(e) => setFormData({...formData, marks_obtained: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Total Marks *</Label>
                      <Input type="number" value={formData.total_marks} onChange={(e) => setFormData({...formData, total_marks: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Assessment Date *</Label>
                      <Input type="date" value={formData.assessment_date} onChange={(e) => setFormData({...formData, assessment_date: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Semester</Label>
                      <Input value={formData.semester} onChange={(e) => setFormData({...formData, semester: e.target.value})} placeholder="e.g., Sem 1" />
                    </div>
                  </div>
                  <div>
                    <Label>Remarks</Label>
                    <Input value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} placeholder="Optional notes" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      {editingPerformance ? "Update" : "Add"} Record
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {message && (
          <Alert className={message.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Filter by Batch</Label>
            <Select value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger><SelectValue placeholder="All Batches"/></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Batches</SelectItem>
                {batches.map(b => <SelectItem key={b.id} value={b.batch_id}>{b.batch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filter by Student</Label>
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger><SelectValue placeholder="All Students"/></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Students</SelectItem>
                {filteredStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search</Label>
            <Input placeholder="Search by name or subject" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle>Performance Records ({getFilteredPerformances().length})</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <p>Loading performance data...</p>
            ) : getFilteredPerformances().length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No performance records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getFilteredPerformances().map(perf => {
                  const stats = getStudentStats(perf.student_id);
                  return (
                    <div 
                      key={perf.id} 
                      className="border-0 rounded-2xl p-4 backdrop-blur-xl bg-white/80 hover:bg-white/95 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                      onClick={() => {
                        const student = students.find(s => s.id === perf.student_id);
                        if (student) {
                          const studentStats = getStudentStats(student.id);
                          const studentPerfs = performances.filter(p => p.student_id === student.id);
                          showStudentDialog(student, studentStats, studentPerfs);
                        }
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{perf.student_name}</h3>
                            <Badge className={`${
                              perf.grade === 'A+' || perf.grade === 'A' ? 'bg-green-100 text-green-800' :
                              perf.grade === 'B+' || perf.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              perf.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {perf.grade}
                            </Badge>
                            {stats && (
                              <span className="text-xs text-gray-500">
                                Avg: {stats.avgPercentage}% ({stats.avgGrade})
                              </span>
                            )}
                          </div>
                          <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                            <p><strong>Roll No:</strong> {perf.roll_no}</p>
                            <p><strong>Subject:</strong> {perf.subject}</p>
                            <p><strong>Assessment:</strong> {perf.assessment_type}</p>
                            <p><strong>Marks:</strong> {perf.marks_obtained}/{perf.total_marks} ({perf.percentage}%)</p>
                            <p><strong>Date:</strong> {perf.assessment_date}</p>
                            <p><strong>Batch:</strong> {batches.find(b => b.batch_id === perf.batch_id)?.batch_name}</p>
                          </div>
                          {perf.remarks && <p className="text-sm text-gray-500 mt-2 italic">{perf.remarks}</p>}
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="icon" onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(perf);
                          }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(perf.id);
                          }}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ManageStudentEmailsModal 
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        students={students}
        onUpdate={loadData}
      />

      {/* Student Summary Dialog */}
      {studentDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setStudentDialog(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">{studentDialog.student.name}</h2>
                  <div className="flex gap-3 text-blue-100">
                    <span>Roll No: {studentDialog.student.roll_no}</span>
                    {studentDialog.student.prn && <span>• PRN: {studentDialog.student.prn}</span>}
                  </div>
                </div>
                <button onClick={() => setStudentDialog(null)} className="text-white hover:bg-white/20 rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {studentDialog.stats && (
                <div className="grid grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                    <CardContent className="p-6">
                      <Award className="w-10 h-10 mb-3 opacity-80" />
                      <div className="text-3xl font-bold">{studentDialog.stats.avgGrade}</div>
                      <div className="text-green-100">Average Grade</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                    <CardContent className="p-6">
                      <TrendingUp className="w-10 h-10 mb-3 opacity-80" />
                      <div className="text-3xl font-bold">{studentDialog.stats.avgPercentage}%</div>
                      <div className="text-blue-100">Average Score</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                    <CardContent className="p-6">
                      <BarChart3 className="w-10 h-10 mb-3 opacity-80" />
                      <div className="text-3xl font-bold">{studentDialog.stats.totalAssessments}</div>
                      <div className="text-purple-100">Assessments</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold mb-4">Performance History</h3>
                <div className="space-y-3">
                  {studentDialog.perfs.map(perf => (
                    <div key={perf.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">{perf.subject}</span>
                            <Badge className={`${
                              perf.grade === 'A+' || perf.grade === 'A' ? 'bg-green-100 text-green-800' :
                              perf.grade === 'B+' || perf.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              perf.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {perf.grade}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <span>{perf.assessment_type}</span>
                            <span>{perf.marks_obtained}/{perf.total_marks} ({perf.percentage}%)</span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{perf.assessment_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}