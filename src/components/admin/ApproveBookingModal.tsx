import { useState, useEffect } from "react";
import type { Booking, ApprovalDetails } from "@/types/booking";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Monitor,
  Video,
  Projector,
  Square,
  PhoneCall,
  Plug,
  Check,
} from "lucide-react";

const EQUIPMENT_ITEMS: {
  bookingKey: keyof Booking;
  provideKey: keyof NonNullable<ApprovalDetails["provideEquipment"]>;
  label: string;
  icon: typeof Monitor;
}[] = [
  { bookingKey: "needsDisplayScreen", provideKey: "displayScreen", label: "Display screen", icon: Monitor },
  { bookingKey: "needsVideoConferencing", provideKey: "videoConferencing", label: "Video conferencing", icon: Video },
  { bookingKey: "needsProjector", provideKey: "projector", label: "Projector", icon: Projector },
  { bookingKey: "needsWhiteboard", provideKey: "whiteboard", label: "Whiteboard", icon: Square },
  { bookingKey: "needsConferencePhone", provideKey: "conferencePhone", label: "Conference phone", icon: PhoneCall },
  { bookingKey: "needsExtensionPower", provideKey: "extensionPower", label: "Extension power", icon: Plug },
];

export interface ApproveBookingModalProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (approvalDetails: ApprovalDetails) => void;
}

export function ApproveBookingModal({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: ApproveBookingModalProps) {
  const [provideEquipment, setProvideEquipment] = useState<
    Record<string, boolean>
  >({});
  const [provideCatering, setProvideCatering] = useState(true);
  const [adminComments, setAdminComments] = useState("");

  const hasCatering =
    booking?.cateringOption &&
    booking.cateringOption !== "NONE";

  const requestedEquipment = EQUIPMENT_ITEMS.filter(
    (item) => booking && booking[item.bookingKey]
  );

  useEffect(() => {
    if (!booking || !open) return;
    const requested = EQUIPMENT_ITEMS.filter((item) => booking[item.bookingKey]);
    const initial: Record<string, boolean> = {};
    requested.forEach((item) => {
      initial[item.provideKey] = true;
    });
    setProvideEquipment(initial);
    setProvideCatering(true);
    setAdminComments("");
  }, [booking, open]);

  const handleSubmit = () => {
    if (!booking) return;
    const provideEquipmentPayload: ApprovalDetails["provideEquipment"] = {};
    requestedEquipment.forEach((item) => {
      provideEquipmentPayload[item.provideKey] =
        provideEquipment[item.provideKey] !== false;
    });
    onConfirm({
      provideEquipment: Object.keys(provideEquipmentPayload).length
        ? provideEquipmentPayload
        : undefined,
      provideCatering: hasCatering ? provideCatering : undefined,
      adminComments: adminComments.trim() || undefined,
    });
    onOpenChange(false);
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            Confirm approval
          </DialogTitle>
          <DialogDescription>
            Tick what you will provide for this booking. Unchecked items will be
            removed from the booking and the user will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {requestedEquipment.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Equipment
              </h3>
              <div className="space-y-2">
                {requestedEquipment.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.provideKey}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`equip-${item.provideKey}`}
                        checked={provideEquipment[item.provideKey] !== false}
                        onCheckedChange={(checked) =>
                          setProvideEquipment((prev) => ({
                            ...prev,
                            [item.provideKey]: checked !== false,
                          }))
                        }
                      />
                      <Label
                        htmlFor={`equip-${item.provideKey}`}
                        className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        We will provide {item.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {hasCatering && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Catering
              </h3>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="provide-catering"
                  checked={provideCatering}
                  onCheckedChange={(checked) =>
                    setProvideCatering(checked === true)
                  }
                />
                <Label
                  htmlFor="provide-catering"
                  className="text-sm font-normal cursor-pointer"
                >
                  We will provide requested catering
                </Label>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-comments" className="text-sm">
              Comments (optional)
            </Label>
            <textarea
              id="admin-comments"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Any notes for the user (included in the confirmation email)"
              value={adminComments}
              onChange={(e) => setAdminComments(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Confirm and send email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
