import { Booking } from '@/types/booking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, Clock, Users, Building, Mail, Phone, 
  FileText, CheckCircle2, XCircle, AlertCircle,
  Monitor, Video, Projector, Square, PhoneCall, Plug
} from 'lucide-react';

interface BookingDetailsDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailsDialog({ booking, open, onOpenChange }: BookingDetailsDialogProps) {
  if (!booking) return null;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const dateOnly = dateStr.split('T')[0];
    const [year, month, day] = dateOnly.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getAttendanceTypeBadge = (type?: string) => {
    if (!type) return null;
    return type === 'INTERNAL' 
      ? <Badge variant="default">Internal (BMH)</Badge>
      : <Badge variant="outline">External</Badge>;
  };

  const getBookingTypeBadge = (type?: string) => {
    if (!type) return null;
    return type === 'FREE_HOURS'
      ? <Badge className="bg-blue-600 hover:bg-blue-700">Free Hours</Badge>
      : <Badge className="bg-orange-600 hover:bg-orange-700">Hire</Badge>;
  };

  const getCateringLabel = (option?: string) => {
    switch (option) {
      case 'TEA_COFFEE_WATER':
        return 'Tea/Coffee and water only';
      case 'LIGHT_SNACKS':
        return 'Light (Snacks) catering (Approval required)';
      case 'NONE':
      default:
        return 'None';
    }
  };

  const equipmentItems = [
    { key: 'needsDisplayScreen', label: 'Display screen', icon: Monitor },
    { key: 'needsVideoConferencing', label: 'Video conferencing', icon: Video },
    { key: 'needsProjector', label: 'Projector', icon: Projector },
    { key: 'needsWhiteboard', label: 'Whiteboard', icon: Square },
    { key: 'needsConferencePhone', label: 'Conference phone', icon: PhoneCall },
    { key: 'needsExtensionPower', label: 'Extension power', icon: Plug },
  ];

  const selectedEquipment = equipmentItems.filter(item => booking[item.key as keyof Booking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Booking Details</span>
            <div className="flex gap-2">
              {getStatusBadge(booking.status)}
              {getAttendanceTypeBadge(booking.attendanceType)}
              {getBookingTypeBadge(booking.bookingType)}
            </div>
          </DialogTitle>
          <DialogDescription>
            Complete information for this boardroom booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p className="text-sm text-muted-foreground">{formatDate(booking.date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    {booking.durationHours && (
                      <span className="ml-2 text-xs">({booking.durationHours.toFixed(2)} hours)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Attendees</p>
                  <p className="text-sm text-muted-foreground">{booking.attendees} {booking.attendees === 1 ? 'person' : 'people'}</p>
                </div>
              </div>
              {booking.attendanceType && (
                <div className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Attendance Type</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.attendanceType === 'INTERNAL' ? 'Internal (BMH)' : 'External'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Organization & Contact */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Organization & Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Organization</p>
                  <p className="text-sm text-muted-foreground">{booking.organizationName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Contact Name</p>
                  <p className="text-sm text-muted-foreground">{booking.contactName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Contact Email</p>
                  <p className="text-sm text-muted-foreground">{booking.contactEmail}</p>
                </div>
              </div>
              {booking.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Contact Phone</p>
                    <p className="text-sm text-muted-foreground">{booking.contactPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Meeting Details */}
          {booking.purpose && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Meeting Details</h3>
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Purpose</p>
                    <p className="text-sm text-muted-foreground">{booking.purpose}</p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Equipment Required */}
          {selectedEquipment.length > 0 && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Required Equipment</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEquipment.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Badge key={item.key} variant="secondary" className="gap-1.5">
                        <Icon className="w-3 h-3" />
                        {item.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Catering */}
          {booking.cateringOption && booking.cateringOption !== 'NONE' && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Catering & Refreshments</h3>
                <p className="text-sm text-muted-foreground">{getCateringLabel(booking.cateringOption)}</p>
              </div>
              <Separator />
            </>
          )}

          {/* Booking Type & Duration */}
          {(booking.bookingType || booking.durationHours) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Billing Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {booking.bookingType && (
                  <div>
                    <p className="text-sm font-medium">Booking Type</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.bookingType === 'FREE_HOURS' ? 'Free Hours' : 'Hire'}
                    </p>
                  </div>
                )}
                {booking.durationHours && (
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.durationHours.toFixed(2)} hours
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
