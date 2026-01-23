import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import ExcalidrawEditor from "../excalidraw/ExcalidrawEditor";

export default function StudentTeachingNotes({ student }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [viewingNote, setViewingNote] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [student]);

  const fetchNotes = async () => {
    try {
      const notesList = await base44.entities.TeachingNote.filter({
        batch_id: student.batch_id
      }, '-session_date');
      setNotes(notesList);
    } catch (error) {
      console.error("Error fetching teaching notes:", error);
    }
    setLoading(false);
  };

  const subjects = ['all', ...new Set(notes.map(n => n.subject))];

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          note.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleView = (note) => {
    try {
      const parsed = JSON.parse(note.excalidraw_data);
      setViewingNote({ ...note, parsedData: parsed });
    } catch (error) {
      console.error("Failed to parse note data:", error);
    }
  };

  if (loading) {
    return <div className="h-64 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📝 Teaching Notes</h1>
        <p className="text-gray-600 mt-1">Interactive whiteboard notes from your teachers</p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          {subjects.map(sub => (
            <option key={sub} value={sub}>{sub === 'all' ? 'All Subjects' : sub}</option>
          ))}
        </select>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map(note => (
          <Card key={note.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-lg">{note.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Subject:</strong> {note.subject}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Topic:</strong> {note.topic}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Faculty:</strong> {note.faculty_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {format(new Date(note.session_date), 'PP')}
                </p>
              </div>

              <Button 
                onClick={() => handleView(note)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Note
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No teaching notes available yet</p>
        </div>
      )}

      {/* Viewer Dialog */}
      <Dialog open={viewingNote !== null} onOpenChange={() => setViewingNote(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {viewingNote?.title} - {viewingNote?.topic}
            </DialogTitle>
          </DialogHeader>
          {viewingNote && (
            <div className="h-full">
              <ExcalidrawEditor
                noteId={viewingNote.id}
                initialData={viewingNote.parsedData}
                readOnly={true}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}