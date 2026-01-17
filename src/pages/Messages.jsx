import React, { useState, useEffect } from "react";
import { Message, User, Faculty, Student } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Plus, Mail, MailOpen } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [students, setStudents] = useState([]);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [formData, setFormData] = useState({
    receiver_email: "",
    subject: "",
    message_content: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [currentUser, messageData, facultyData, studentData] = await Promise.all([
        User.me(),
        Message.list("-created_date", 200),
        Faculty.list(),
        Student.list()
      ]);
      setUser(currentUser);
      setMessages(messageData);
      setFaculties(facultyData);
      setStudents(studentData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    try {
      const receiver = [...faculties, ...students].find(p => p.email === formData.receiver_email);
      
      await Message.create({
        ...formData,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_email: user.email,
        receiver_id: receiver?.id || "",
        receiver_name: receiver?.name || formData.receiver_email,
        sent_date: new Date().toISOString(),
        is_read: false
      });
      
      setAlertMessage({ type: "success", text: "Message sent successfully!" });
      await loadData();
      resetForm();
      setShowComposeModal(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setAlertMessage({ type: "error", text: "Failed to send message" });
    }
  };

  const markAsRead = async (message) => {
    if (!message.is_read && message.receiver_email === user.email) {
      await Message.update(message.id, { is_read: true, read_date: new Date().toISOString() });
      await loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      receiver_email: "",
      subject: "",
      message_content: ""
    });
  };

  const inbox = messages.filter(m => m.receiver_email === user?.email);
  const sent = messages.filter(m => m.sender_email === user?.email);
  const unreadCount = inbox.filter(m => !m.is_read).length;

  const displayMessages = activeTab === "inbox" ? inbox : sent;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              Messages
            </h1>
            <p className="text-gray-600">Direct messaging with faculty and students</p>
          </div>
          <Dialog open={showComposeModal} onOpenChange={setShowComposeModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="w-4 h-4" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <Label>To *</Label>
                  <Select value={formData.receiver_email} onValueChange={(value) => setFormData({...formData, receiver_email: value})}>
                    <SelectTrigger><SelectValue placeholder="Select recipient"/></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500">Faculty</div>
                      {faculties.map(f => (
                        <SelectItem key={f.id} value={f.email}>{f.name} ({f.email})</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Students</div>
                      {students.slice(0, 50).map(s => (
                        <SelectItem key={s.id} value={s.email || s.roll_no}>{s.name} ({s.roll_no})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject *</Label>
                  <Input value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required />
                </div>
                <div>
                  <Label>Message *</Label>
                  <Textarea rows={6} value={formData.message_content} onChange={(e) => setFormData({...formData, message_content: e.target.value})} required />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowComposeModal(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600">Send Message</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {alertMessage && (
          <Alert className={alertMessage.type === "error" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
            <AlertDescription className={alertMessage.type === "error" ? "text-red-800" : "text-green-800"}>
              {alertMessage.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 mb-4">
          <Button 
            variant={activeTab === "inbox" ? "default" : "outline"} 
            onClick={() => setActiveTab("inbox")}
            className={activeTab === "inbox" ? "bg-blue-600" : ""}
          >
            Inbox {unreadCount > 0 && `(${unreadCount})`}
          </Button>
          <Button 
            variant={activeTab === "sent" ? "default" : "outline"} 
            onClick={() => setActiveTab("sent")}
            className={activeTab === "sent" ? "bg-blue-600" : ""}
          >
            Sent
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {displayMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No messages in {activeTab}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayMessages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${!msg.is_read && activeTab === "inbox" ? "bg-blue-50" : ""}`}
                    onClick={() => {
                      setSelectedMessage(msg);
                      markAsRead(msg);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {!msg.is_read && activeTab === "inbox" && <MailOpen className="w-4 h-4 text-blue-600" />}
                        <span className="font-semibold">
                          {activeTab === "inbox" ? `From: ${msg.sender_name}` : `To: ${msg.receiver_name}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{format(new Date(msg.sent_date), "MMM d, h:mm a")}</span>
                    </div>
                    <p className="font-semibold text-sm">{msg.subject}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.message_content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedMessage && (
          <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedMessage.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <p><strong>From:</strong> {selectedMessage.sender_name} ({selectedMessage.sender_email})</p>
                    <p><strong>To:</strong> {selectedMessage.receiver_name} ({selectedMessage.receiver_email})</p>
                  </div>
                  <p className="text-gray-500">{format(new Date(selectedMessage.sent_date), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="whitespace-pre-wrap">{selectedMessage.message_content}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}