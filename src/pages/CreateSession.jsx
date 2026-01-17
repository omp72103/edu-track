import React, { useState, useEffect } from "react";
import { Batch, Session, User, Faculty, Student, College } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ArrowLeft, Info, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const years = ["First Year", "Second Year", "Third Year", "Fourth Year"];
// Expanded branch list
const branches = [
    "Computer Science Engineering",
    "Artificial Intelligence & Machine Learning",
    "Data Science",
    "Computer Science & Business Systems",
    "Electronics & Telecommunication",
    "Information Technology",
    "Mechanical Engineering",
    "Civil Engineering",
    "Textile Engineering",
    "Bio-Technology Engineering",
    "Chemical Engineering",
    "Environmental Engineering",
    "Electrical Engineering",
    "Production Engineering"
];
const divisions = ["A", "B", "C", "D", "Not Applicable"];
const durations = ["1 Hour", "1.5 Hours", "2 Hours", "2.5 Hours", "3 Hours"];
// Custom batches are now fetched from database

export default function CreateSession() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [privateBatches, setPrivateBatches] = useState([]);
  const [customBatches, setCustomBatches] = useState([]);
  const [stats, setStats] = useState({ batches: 0, students: 0, faculty: 0 });
  const [batchType, setBatchType] = useState("standard");
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    session_name: "",
    college_name: "",
    year: "",
    branch: "",
    division: "",
    custom_batch_id: "",
    private_batch_id: "",
    faculty_name: "",
    faculty_email: "",
    topic_taught: "",
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_time: "",
    duration: "1 Hour",
    tpo_email: ""
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const [collegeData, studentData, facultyData, batchData] = await Promise.all([
            College.list(),
            Student.list(),
            Faculty.list(),
            Batch.list()
        ]);

        setColleges(collegeData);
        setFaculties(facultyData);
        setPrivateBatches(batchData.filter(b => b.batch_type === 'private'));
        setCustomBatches(batchData.filter(b => b.batch_type === 'custom'));

        const userAsFaculty = facultyData.find(f => f.email === currentUser.email);
        if(userAsFaculty) {
            setFormData(prev => ({
                ...prev,
                faculty_name: userAsFaculty.name,
                faculty_email: userAsFaculty.email
            }));
        } else {
            setFormData(prev => ({...prev, faculty_name: currentUser.full_name || ''}));
        }

        setStats({
            batches: batchData.length,
            students: studentData.length,
            faculty: facultyData.length
        });

      } catch (e) {
        console.error("Failed to fetch initial data", e);
        setError("Failed to load initial data. Please refresh the page.");
      }
    }
    fetchData();
  }, []);

  const handleFacultyChange = (email) => {
    const selectedFaculty = faculties.find(f => f.email === email);
    if (selectedFaculty) {
      setFormData({
        ...formData,
        faculty_name: selectedFaculty.name,
        faculty_email: selectedFaculty.email,
      });
    } else {
      // Clear faculty details if nothing is selected or an invalid value
      setFormData({
        ...formData,
        faculty_name: "",
        faculty_email: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let batchId;
      let batchName;
      let batchDescription;
      let sessionCollege;
      let sessionYear;
      let sessionBranch;
      let sessionDivision;

      // CORE validation for session details
      if (!formData.session_name || !formData.topic_taught || !formData.faculty_email || !formData.session_date || !formData.session_time) {
        setError("Please fill in required session details: Session Name, Topic, Faculty, Date, and Time.");
        setIsLoading(false);
        return;
      }

      if (batchType === "standard") {
        if (!formData.college_name || !formData.year || !formData.branch || !formData.division) {
          setError("For a Standard Batch, please select College, Year, Branch, and Division.");
          setIsLoading(false);
          return;
        }

        const selectedCollege = colleges.find(c => c.college_name === formData.college_name);
        const collegeShortName = selectedCollege ? selectedCollege.short_name : formData.college_name;
        batchId = `${collegeShortName}_${formData.year}_${formData.branch}_${formData.division}`.toLowerCase().replace(/[^\w-]+/g, '-');
        batchName = `${formData.branch} - Div ${formData.division}`;
        batchDescription = `${formData.year} - ${formData.branch} - Div ${formData.division}`;
        sessionCollege = formData.college_name;
        sessionYear = formData.year;
        sessionBranch = formData.branch;
        sessionDivision = formData.division;
      } else if (batchType === "custom") {
        if (!formData.custom_batch_id) {
          setError("Please select a Custom Batch.");
          setIsLoading(false);
          return;
        }

        const selectedCustomBatch = customBatches.find(b => b.id === formData.custom_batch_id);
        if (!selectedCustomBatch) {
            setError("Selected custom batch not found.");
            setIsLoading(false);
            return;
        }
        batchId = selectedCustomBatch.batch_id;
        batchName = selectedCustomBatch.batch_name;
        batchDescription = selectedCustomBatch.batch_description || selectedCustomBatch.batch_name;
        sessionCollege = selectedCustomBatch.college_name;
        sessionYear = selectedCustomBatch.year;
        sessionBranch = undefined;
        sessionDivision = undefined;
      } else { // Private batch
        if (!formData.private_batch_id) {
          setError("Please select a Private Batch.");
          setIsLoading(false);
          return;
        }

        const selectedPrivateBatch = privateBatches.find(b => b.id === formData.private_batch_id);
        if (!selectedPrivateBatch) {
            setError("Selected private batch not found. Please refresh and try again.");
            setIsLoading(false);
            return;
        }

        // Use private batch data for batch_id, name, description
        batchId = selectedPrivateBatch.batch_id;
        batchName = selectedPrivateBatch.batch_name;
        batchDescription = selectedPrivateBatch.batch_description || selectedPrivateBatch.batch_name; // Fallback to batch_name

        // Set generic values for session context for private batches
        sessionCollege = "Private Training";
        sessionYear = "Mixed";
        sessionBranch = undefined;
        sessionDivision = undefined;
      }

      // Only create batch if it's a standard batch (private and custom batches already exist)
      if (batchType === 'standard') {
        const existingBatches = await Batch.filter({ batch_id: batchId });
        if (existingBatches.length === 0) {
          await Batch.create({
            batch_id: batchId,
            batch_name: batchName,
            batch_description: batchDescription,
            batch_type: batchType,
            college_name: formData.college_name,
            year: formData.year,
            branch: formData.branch,
            division: formData.division,
            student_count: 0,
            created_by: user.email
          });
        }
      }

      const sessionData = {
        session_name: formData.session_name,
        college_name: sessionCollege,
        year: sessionYear,
        branch: sessionBranch,
        division: sessionDivision,
        batch_description: batchDescription,
        faculty_name: formData.faculty_name,
        faculty_email: formData.faculty_email,
        topic_taught: formData.topic_taught,
        session_date: formData.session_date,
        session_time: formData.session_time,
        duration: formData.duration || "1 Hour", // Default duration if not set
        batch_id: batchId,
        tpo_email: formData.tpo_email,
        status: "scheduled",
        total_students: 0,
        present_count: 0
      };

      console.log("Creating session with data:", sessionData); // Debug log

      await Session.create(sessionData);
      navigate(createPageUrl("Dashboard"));
    } catch (err) {
      console.error("Error creating session:", err);
      setError(`Failed to create session: ${err.message || 'An unknown error occurred.'}`);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
         <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="bg-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Create New Session</h1>
            <p className="text-slate-600 mt-1">Schedule a new attendance session for your class</p>
          </div>
        </div>

        {user && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                    Logged in as: <strong>{user.full_name || user.email}</strong>.
                    Database contains: <strong>{stats.batches}</strong> batches, <strong>{stats.students}</strong> students, <strong>{stats.faculty}</strong> faculty members.
                </AlertDescription>
            </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-md border-slate-200 bg-white">
          <CardHeader className="bg-slate-100 border-b">
            <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
              <CalendarIcon className="w-6 h-6" />
              Session Details
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700 pb-2 border-b">Session Information</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="session_name" className="font-semibold text-slate-700">Session Name *</Label>
                    <Input id="session_name" placeholder="e.g., Database Management" value={formData.session_name} onChange={(e) => setFormData({...formData, session_name: e.target.value})} className="mt-2" required />
                  </div>
                  <div>
                    <Label htmlFor="topic_taught" className="font-semibold text-slate-700">Topic to be Taught *</Label>
                    <Input id="topic_taught" placeholder="e.g., SQL Queries" value={formData.topic_taught} onChange={(e) => setFormData({...formData, topic_taught: e.target.value})} className="mt-2" required />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700 pb-2 border-b">Class Information</h3>
                <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Batch Type</Label>
                    <Select value={batchType} onValueChange={(value) => {
                        setBatchType(value);
                        // Reset relevant formData fields when batch type changes
                        setFormData(prev => ({
                            ...prev,
                            college_name: "",
                            year: "",
                            branch: "",
                            division: "",
                            custom_batch_id: "",
                            private_batch_id: ""
                        }));
                    }}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="standard">Standard Batch</SelectItem>
                            <SelectItem value="custom">Custom Batch</SelectItem>
                            <SelectItem value="private">Private Batch</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {batchType === 'standard' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="college_name" className="font-semibold text-slate-700">College Name *</Label>
                        <Select value={formData.college_name} onValueChange={(value) => setFormData({...formData, college_name: value})} required>
                            <SelectTrigger className="mt-2"><SelectValue placeholder="Select college" /></SelectTrigger>
                            <SelectContent>
                                {colleges.map((c) => (
                                    <SelectItem key={c.id} value={c.college_name}>
                                      <div className="flex flex-col">
                                        <span className="font-semibold">{c.short_name}</span>
                                        <span className="text-xs text-slate-500">{c.college_name}</span>
                                      </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="year" className="font-semibold text-slate-700">Academic Year *</Label>
                        <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value})} required>
                            <SelectTrigger className="mt-2"><SelectValue placeholder="Select year" /></SelectTrigger>
                            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                  </div>
                )}

                {batchType === 'standard' && (
                    <div className="grid md:grid-cols-2 gap-6 pt-4">
                        <div>
                            <Label htmlFor="branch" className="font-semibold text-slate-700">Branch/Department *</Label>
                            <Select value={formData.branch} onValueChange={(value) => setFormData({...formData, branch: value})} required={batchType === 'standard'}>
                                <SelectTrigger className="mt-2"><SelectValue placeholder="Select branch" /></SelectTrigger>
                                <SelectContent>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="division" className="font-semibold text-slate-700">Division *</Label>
                            <Select value={formData.division} onValueChange={(value) => setFormData({...formData, division: value})} required={batchType === 'standard'}>
                                <SelectTrigger className="mt-2"><SelectValue placeholder="Select division" /></SelectTrigger>
                                <SelectContent>{divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
                {batchType === 'custom' && (
                    <div className="pt-4 space-y-4">
                        <div>
                          <Label className="font-semibold text-slate-700">Year Filter</Label>
                          <Select value={formData.year} onValueChange={(value) => setFormData({...formData, year: value, custom_batch_id: ""})}>
                            <SelectTrigger className="mt-2"><SelectValue placeholder="All years" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>All Years</SelectItem>
                              <SelectItem value="Second Year">Second Year</SelectItem>
                              <SelectItem value="Third Year">Third Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="custom_batch" className="font-semibold text-slate-700">Custom Batch *</Label>
                          <Select value={formData.custom_batch_id} onValueChange={(value) => setFormData({...formData, custom_batch_id: value})} required>
                              <SelectTrigger className="mt-2"><SelectValue placeholder="Select custom batch" /></SelectTrigger>
                              <SelectContent>
                                  {customBatches.filter(b => !formData.year || b.year === formData.year).length === 0 ? (
                                    <SelectItem value={null} disabled>No custom batches found</SelectItem>
                                  ) : (
                                    customBatches.filter(b => !formData.year || b.year === formData.year).map((b) => (
                                      <SelectItem key={b.id} value={b.id}>
                                        {b.batch_name} - {b.college_name}
                                      </SelectItem>
                                    ))
                                  )}
                              </SelectContent>
                          </Select>
                          {customBatches.length === 0 && (
                            <p className="text-sm text-gray-500 mt-2">
                              No custom batches found. Contact admin to create custom batches.
                            </p>
                          )}
                        </div>
                    </div>
                )}
                {batchType === 'private' && (
                  <div className="pt-4">
                    <Label htmlFor="private_batch" className="font-semibold text-slate-700">Private Batch *</Label>
                    <Select value={formData.private_batch_id} onValueChange={(value) => setFormData({...formData, private_batch_id: value})} required={batchType === 'private'}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="Select private batch" /></SelectTrigger>
                        <SelectContent>
                            {privateBatches.length === 0 ? (
                              <SelectItem value={null} disabled>No private batches found</SelectItem>
                            ) : (
                              privateBatches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.batch_name}
                                </SelectItem>
                              ))
                            )}
                        </SelectContent>
                    </Select>
                    {privateBatches.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        No private batches found. Please create one from the <strong>Manage Batches</strong> page first.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-700 pb-2 border-b">Faculty & Schedule</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="faculty_name" className="font-semibold text-slate-700">Faculty Name *</Label>
                    <Select value={formData.faculty_email} onValueChange={handleFacultyChange} required>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="Select faculty" /></SelectTrigger>
                        <SelectContent>
                            {faculties.map((f) => (
                                <SelectItem key={f.id} value={f.email}>
                                    {f.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tpo_email" className="font-semibold text-slate-700">TPO Email (Optional)</Label>
                    <Input id="tpo_email" type="email" placeholder="tpo@college.edu" value={formData.tpo_email} onChange={(e) => setFormData({...formData, tpo_email: e.target.value})} className="mt-2" />
                  </div>
                </div>
                 <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="session_date" className="font-semibold text-slate-700">Session Date *</Label>
                    <Input id="session_date" type="date" value={formData.session_date} onChange={(e) => setFormData({...formData, session_date: e.target.value})} className="mt-2" required />
                  </div>
                  <div>
                    <Label htmlFor="session_time" className="font-semibold text-slate-700">Session Time *</Label>
                    <Input id="session_time" type="time" value={formData.session_time} onChange={(e) => setFormData({...formData, session_time: e.target.value})} className="mt-2" required />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="font-semibold text-slate-700">Duration *</Label>
                    <Select value={formData.duration} onValueChange={(value) => setFormData({...formData, duration: value})}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Select duration" /></SelectTrigger>
                      <SelectContent>{durations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))} className="px-8 bg-white">Cancel</Button>
                <Button type="submit" disabled={isLoading} className="px-8 bg-blue-600 hover:bg-blue-700">
                  {isLoading ? 'Creating...' : 'Create Session'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}