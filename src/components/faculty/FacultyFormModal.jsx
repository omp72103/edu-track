import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FacultyFormModal({ isOpen, onClose, onSave, facultyMember }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    status: "active",
    rate_per_hour: 0,
  });

  useEffect(() => {
    if (facultyMember) {
      setFormData({
        name: facultyMember.name || "",
        email: facultyMember.email || "",
        department: facultyMember.department || "",
        status: facultyMember.status || "active",
        rate_per_hour: facultyMember.rate_per_hour || 0,
      });
    } else {
      setFormData({ 
        name: "", 
        email: "", 
        department: "", 
        status: "active",
        rate_per_hour: 0
      });
    }
  }, [facultyMember]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{facultyMember ? "Edit Faculty" : "Add New Faculty"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rate_per_hour">Rate per Hour (₹)</Label>
            <Input
              id="rate_per_hour"
              type="number"
              step="0.01"
              placeholder="Enter hourly rate"
              value={formData.rate_per_hour}
              onChange={(e) => setFormData({ ...formData, rate_per_hour: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}