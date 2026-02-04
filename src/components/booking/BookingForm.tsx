import { useState } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingFormData, TIME_SLOTS } from '@/types/booking';

import { useAuth } from '@/hooks/useAuth';
import { useOrganizations } from '@/hooks/useOrganizations';

interface BookingFormProps {
  selectedDate: Date;
  initialStartTime?: string;
  onSubmit: (data: BookingFormData) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function BookingForm({ selectedDate, initialStartTime, onSubmit, onClose }: BookingFormProps) {
  const { user } = useAuth();
  const { organizations } = useOrganizations();

  const [formData, setFormData] = useState<BookingFormData>({
    organizationName: user?.companyName || '',
    contactName: user?.name || '',
    contactEmail: user?.email || '',
    date: selectedDate.toISOString().split('T')[0],
    startTime: initialStartTime || '09:00',
    endTime: getDefaultEndTime(initialStartTime || '09:00'),
    purpose: '',
    attendees: 1,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function getDefaultEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + 1;
    if (endHours > 18) return '18:00';
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.startTime >= formData.endTime) {
      setError('End time must be after start time');
      return;
    }

    try {
      const result = await onSubmit(formData);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create booking');
      }
    } catch (error) {
      setError('Failed to create booking. Please try again.');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const availableEndTimes = TIME_SLOTS.filter((t) => t > formData.startTime);

  if (success) {
    return (
      <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-xl animate-scale-in text-center">
          <div className="w-16 h-16 rounded-full bg-booking-confirmed/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-booking-confirmed" />
          </div>
          <h2 className="text-2xl font-bold text-card-foreground mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            Your boardroom has been booked for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-card rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">Book the Boardroom</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-3 rounded-lg mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select
                value={formData.startTime}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    startTime: value,
                    endTime: value >= prev.endTime ? getDefaultEndTime(value) : prev.endTime,
                  }))
                }
              >
                <SelectTrigger id="startTime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.slice(0, -1).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTime(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Select
                value={formData.endTime}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, endTime: value }))}
              >
                <SelectTrigger id="endTime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableEndTimes.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTime(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Select
              value={formData.organizationName}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, organizationName: value }))
              }
              required
            >
              <SelectTrigger id="organizationName">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.name}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                required
                value={formData.contactName}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                required
                value={formData.contactEmail}
                onChange={(e) => setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendees">Number of Attendees</Label>
            <Input
              id="attendees"
              type="number"
              min={1}
              max={50}
              required
              value={formData.attendees}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, attendees: parseInt(e.target.value) || 1 }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Meeting Purpose</Label>
            <Textarea
              id="purpose"
              required
              placeholder="Brief description of the meeting..."
              rows={3}
              value={formData.purpose}
              onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Confirm Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
