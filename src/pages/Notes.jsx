import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FileText, PenTool, Plus, Calendar, User, Edit, Trash2, Search } from "lucide-react";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function NotesPage() {
  const [teachingNotes, setTeachingNotes] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesData, materialsData] = await Promise.all([
        base44.entities.TeachingNote.list('-created_date', 100),
        base44.entities.Note.list('-created_date', 100)
      ]);
      setTeachingNotes(notesData);
      setStudyMaterials(materialsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleDeleteNote = async (id) => {
    if (confirm('Are you sure you want to delete this teaching note?')) {
      try {
        await base44.entities.TeachingNote.delete(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting note:", error);
      }
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (confirm('Are you sure you want to delete this study material?')) {
      try {
        await base44.entities.Note.delete(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting material:", error);
      }
    }
  };

  // Get all subjects for filter
  const allSubjects = ['all', ...new Set([
    ...teachingNotes.map(n => n.subject).filter(Boolean),
    ...studyMaterials.map(n => n.subject).filter(Boolean)
  ])];

  // Filter function
  const filterItems = (items) => {
    return items.filter(item => {
      const matchesSearch = 
        (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.topic || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = filterSubject === 'all' || item.subject === filterSubject;
      return matchesSearch && matchesSubject;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BookOpen className="w-8 h-8" />
                Notes & Materials
              </h1>
              <p className="text-blue-100 mt-2">Manage teaching notes and study materials in one place</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search notes by title or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  {allSubjects.map(sub => (
                    <SelectItem key={sub} value={sub}>
                      {sub === 'all' ? 'All Subjects' : sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="teaching" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-lg rounded-xl p-1 h-14">
            <TabsTrigger value="teaching" className="rounded-lg text-base flex items-center gap-2">
              <PenTool className="w-5 h-5" />
              Teaching Notes ({teachingNotes.length})
            </TabsTrigger>
            <TabsTrigger value="study" className="rounded-lg text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Study Materials ({studyMaterials.length})
            </TabsTrigger>
          </TabsList>

          {/* Teaching Notes Tab */}
          <TabsContent value="teaching" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => window.location.href = createPageUrl("TeachingNoteEditor")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Teaching Note
              </Button>
            </div>

            {filterItems(teachingNotes).length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Teaching Notes</h3>
                  <p className="text-gray-500 mb-4">Create interactive whiteboard notes using Excalidraw</p>
                  <Button
                    onClick={() => window.location.href = createPageUrl("TeachingNoteEditor")}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Note
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterItems(teachingNotes).map(note => (
                  <Card key={note.id} className="border-0 shadow-lg hover:shadow-xl transition-all group">
                    <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-start justify-between">
                        <PenTool className="w-8 h-8 text-purple-600" />
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = createPageUrl(`TeachingNoteEditor?id=${note.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{note.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{note.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>{note.topic}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{format(new Date(note.created_date), 'PP')}</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-xs text-gray-500 mb-2">For: {note.batch_name || 'All batches'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Study Materials Tab */}
          <TabsContent value="study" className="space-y-4">
            {filterItems(studyMaterials).length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Study Materials</h3>
                  <p className="text-gray-500">Upload notes, PDFs, or other study materials for students</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterItems(studyMaterials).map(material => (
                  <Card key={material.id} className="border-0 shadow-lg hover:shadow-xl transition-all group">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-start justify-between">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteMaterial(material.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
                      {material.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
                      )}
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        {material.subject && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{material.subject}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>{format(new Date(material.created_date), 'PP')}</span>
                        </div>
                        {material.uploaded_by_name && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span>{material.uploaded_by_name}</span>
                          </div>
                        )}
                      </div>
                      {material.file_url && (
                        <Button
                          onClick={() => window.open(material.file_url, '_blank')}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          View/Download
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}