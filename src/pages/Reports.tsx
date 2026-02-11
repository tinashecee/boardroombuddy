import { Header } from "@/components/booking/Header";
import { Footer } from "@/components/booking/Footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, FileDown, Loader2, Calendar, Building2, CalendarCheck, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useReports, type ReportFilters, type ReportBooking } from "@/hooks/useReports";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  formatEquipmentList,
  formatCateringOption,
  formatBookingType,
  formatAttendanceType,
  calculateRevenue,
} from "@/utils/reportFormatters";
import { generateBookingReportPDF } from "@/utils/pdfGenerator";
import { useState, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

function equipmentList(b: ReportBooking): string {
  const items: string[] = [];
  if (b.needsDisplayScreen) items.push("Display screen");
  if (b.needsVideoConferencing) items.push("Video conferencing");
  if (b.needsProjector) items.push("Projector");
  if (b.needsWhiteboard) items.push("Whiteboard");
  if (b.needsConferencePhone) items.push("Conference phone");
  if (b.needsExtensionPower) items.push("Extension power");
  return items.length ? items.join(", ") : "None";
}

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations } = useOrganizations();
  const {
    reportData,
    isLoading,
    error,
    fetchReport,
    defaultFilters,
  } = useReports();

  const isAdmin = user?.role === "ADMIN";
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      await fetchReport(filters);
    } catch {
      // error already set in hook
    }
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    generateBookingReportPDF(reportData, filters);
  };

  const revenue = useMemo(() => {
    if (!reportData?.bookings.length || !organizations.length) return 0;
    return calculateRevenue(reportData.bookings as Parameters<typeof calculateRevenue>[0], organizations);
  }, [reportData?.bookings, organizations]);

  const orgOptions = useMemo(() => {
    if (!isAdmin) return [];
    return organizations.map((o) => ({ value: o.name, label: o.name }));
  }, [isAdmin, organizations]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8 animate-fade-in flex-1">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Generate booking reports by organization and date range. Export as PDF.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Select organization and date range, then generate report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {isAdmin && (
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Select
                    value={filters.organizationName || "all"}
                    onValueChange={(v) =>
                      setFilters((prev) => ({ ...prev, organizationName: v === "all" ? "" : v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organizations</SelectItem>
                      {orgOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isAdmin && user?.companyName && (
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <div className="flex h-10 items-center rounded-md border px-3 text-sm bg-muted/50">
                    <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    {user.companyName}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Date filter</Label>
                <Select
                  value={filters.filterType}
                  onValueChange={(v: "month" | "range") =>
                    setFilters((prev) => ({ ...prev, filterType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">By month</SelectItem>
                    <SelectItem value="range">Date range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filters.filterType === "month" && (
                <div className="space-y-2">
                  <Label>Month</Label>
                  <input
                    type="month"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={filters.month}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, month: e.target.value }))
                    }
                  />
                </div>
              )}

              {filters.filterType === "range" && (
                <>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
              {reportData && (
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export as PDF
                </Button>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Report header: logo + branding (when report is generated) */}
        {reportData && (
          <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">BoardRoom Pro</h2>
                  <p className="text-sm text-muted-foreground">Shared Boardroom Management</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Booking Report
                    {reportData.metadata.organizationFilter && ` · ${reportData.metadata.organizationFilter}`}
                    {reportData.metadata.dateRange.start && reportData.metadata.dateRange.end &&
                      ` · ${reportData.metadata.dateRange.start} to ${reportData.metadata.dateRange.end}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary — single card with clear stat grid */}
        {reportData && (
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Summary</CardTitle>
              <CardDescription>Overview of bookings and hours for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CalendarCheck className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Bookings</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{reportData.summary.totalBookings}</span>
                </div>
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Total Hours</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{reportData.summary.totalHours}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">booked</span>
                </div>
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Confirmed & Held</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{reportData.summary.confirmedHeldHours ?? 0}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">hours</span>
                </div>
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Free Hours Used</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{reportData.summary.freeHoursUsed}</span>
                </div>
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Paid Hours</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{reportData.summary.paidHours}</span>
                </div>
                <div className="flex flex-col rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Revenue (est.)</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">
                    {revenue > 0 ? `$${revenue.toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">By status</span>
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Confirmed: <strong>{reportData.summary.byStatus.confirmed}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Pending: <strong>{reportData.summary.byStatus.pending}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Cancelled: <strong>{reportData.summary.byStatus.cancelled}</strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed table */}
        {reportData && reportData.bookings.length > 0 && (
          <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>All bookings in the selected range. Expand row for purpose and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Attendees</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Catering</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.bookings.map((booking) => (
                    <Fragment key={booking.id}>
                      <TableRow className="hover:bg-muted/30">
                        <TableCell className="w-8 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              setExpandedId((id) => (id === booking.id ? null : booking.id))
                            }
                          >
                            {expandedId === booking.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{booking.date}</TableCell>
                        <TableCell>{booking.startTime} – {booking.endTime}</TableCell>
                        <TableCell>
                          {booking.durationHours != null
                            ? `${Number(booking.durationHours).toFixed(2)} h`
                            : "—"}
                        </TableCell>
                        <TableCell>{booking.organizationName}</TableCell>
                        <TableCell>{booking.contactName}</TableCell>
                        <TableCell>{booking.attendees}</TableCell>
                        <TableCell>{formatAttendanceType(booking.attendanceType)}</TableCell>
                        <TableCell className="max-w-[180px] text-xs">
                          {equipmentList(booking)}
                        </TableCell>
                        <TableCell>{formatCateringOption(booking.cateringOption)}</TableCell>
                        <TableCell>{formatBookingType(booking.bookingType)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      {expandedId === booking.id && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={11} className="text-sm text-muted-foreground">
                            <div className="py-2 space-y-1">
                              <p><strong>Purpose:</strong> {booking.purpose || "—"}</p>
                              <p><strong>Email:</strong> {booking.contactEmail}</p>
                              {booking.contactPhone && (
                                <p><strong>Phone:</strong> {booking.contactPhone}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {reportData && reportData.bookings.length === 0 && (
          <Card className="shadow-sm border-muted-foreground/10">
            <CardContent className="py-12 text-center text-muted-foreground">
              No bookings found for the selected filters.
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Reports;
