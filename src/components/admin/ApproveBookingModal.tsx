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
  const [provideCateringTeaCoffee, setProvideCateringTeaCoffee] = useState(false);
  const [provideCateringSnacks, setProvideCateringSnacks] = useState(false);
  const [adminComments, setAdminComments] = useState("");

  useEffect(() => {
    if (!booking || !open) return;
    const initialEquip: Record<string, boolean> = {};
    EQUIPMENT_ITEMS.forEach((item) => {
      initialEquip[item.provideKey] = !!booking[item.bookingKey];
    });
    setProvideEquipment(initialEquip);
    setProvideCateringTeaCoffee(
      booking.cateringOption === "TEA_COFFEE_WATER" || booking.cateringOption === "LIGHT_SNACKS"
    );
    setProvideCateringSnacks(booking.cateringOption === "LIGHT_SNACKS");
    setAdminComments("");
  }, [booking, open]);

  const handleSubmit = () => {
    if (!booking) return;
    const provideEquipmentPayload: ApprovalDetails["provideEquipment"] = {};
    EQUIPMENT_ITEMS.forEach((item) => {
      provideEquipmentPayload[item.provideKey] =
        provideEquipment[item.provideKey] === true;
    });
    onConfirm({
      provideEquipment: provideEquipmentPayload,
      provideCateringTeaCoffee,
      provideCateringSnacks,
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
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Equipment
            </h3>
            <p className="text-xs text-muted-foreground">
              Tick everything you will provide. You can add items the user did not request.
            </p>
            <div className="space-y-2">
              {EQUIPMENT_ITEMS.map((item) => {
                const Icon = item.icon;
                const requested = !!booking[item.bookingKey];
                return (
                  <div
                    key={item.provideKey}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`equip-${item.provideKey}`}
                      checked={provideEquipment[item.provideKey] === true}
                      onCheckedChange={(checked) =>
                        setProvideEquipment((prev) => ({
                          ...prev,
                          [item.provideKey]: checked === true,
                        }))
                      }
                    />
                    <Label
                      htmlFor={`equip-${item.provideKey}`}
                      className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      We will provide {item.label}
                      {requested && (
                        <span className="text-xs text-muted-foreground">(requested)</span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Catering
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="provide-tea"
                  checked={provideCateringTeaCoffee}
                  onCheckedChange={(checked) =>
                    setProvideCateringTeaCoffee(checked === true)
                  }
                />
                <Label htmlFor="provide-tea" className="text-sm font-normal cursor-pointer">
                  We will provide Tea/Coffee &amp; Water
                  {(booking.cateringOption === "TEA_COFFEE_WATER" || booking.cateringOption === "LIGHT_SNACKS") && (
                    <span className="text-xs text-muted-foreground ml-1">(requested)</span>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="provide-snacks"
                  checked={provideCateringSnacks}
                  onCheckedChange={(checked) =>
                    setProvideCateringSnacks(checked === true)
                  }
                />
                <Label htmlFor="provide-snacks" className="text-sm font-normal cursor-pointer">
                  We will provide Light snacks
                  {booking.cateringOption === "LIGHT_SNACKS" && (
                    <span className="text-xs text-muted-foreground ml-1">(requested)</span>
                  )}
                </Label>
              </div>
            </div>
          </div>

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
