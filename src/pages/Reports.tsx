import { Header } from "@/components/booking/Header";
import { Footer } from "@/components/booking/Footer";
import { useBookings } from "@/hooks/useBookings";
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
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";
import {
    History,
    TrendingUp,
    Users,
    Clock,
    Calendar,
    ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reports = () => {
    const { bookings, allBookings } = useBookings();
    const navigate = useNavigate();
    
    // Use allBookings for reports (shows all bookings, not just user's)
    // Fallback to bookings if allBookings is not available
    const reportBookings = allBookings && allBookings.length > 0 ? allBookings : bookings;

    const stats = useMemo(() => {
        const total = reportBookings.length;
        const confirmed = reportBookings.filter(b => b.status === 'confirmed').length;
        const cancelled = reportBookings.filter(b => b.status === 'cancelled').length;

        // Organization stats
        const orgMap: Record<string, number> = {};
        reportBookings.forEach(b => {
            orgMap[b.organizationName] = (orgMap[b.organizationName] || 0) + 1;
        });

        const orgData = Object.entries(orgMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Day of week stats
        const dayMap: Record<string, number> = {
            'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0
        };

        reportBookings.forEach(b => {
            const date = new Date(b.date);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            if (dayMap[day] !== undefined) {
                dayMap[day]++;
            }
        });

        const dayData = Object.entries(dayMap).map(([name, value]) => ({ name, value }));

        return {
            total,
            confirmed,
            cancelled,
            orgData,
            dayData,
            topOrg: orgData[0]?.name || "N/A"
        };
    }, [reportBookings]);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="container mx-auto px-4 py-8 space-y-8 animate-fade-in flex-1">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                        <p className="text-muted-foreground">
                            Deep dive into boardroom usage and reservation patterns.
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                            <History className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Lifetime reservations
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Top Organization</CardTitle>
                            <Users className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold truncate max-w-full">{stats.topOrg}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Most active group
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Confirmation Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Successfully held
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">Cancellation Rate</CardTitle>
                            <Clock className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.total > 0 ? Math.round((stats.cancelled / stats.total) * 100) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Rescheduled or voided
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <CardTitle>Usage Frequency</CardTitle>
                            <CardDescription>Bookings by day of the week</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.dayData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <CardTitle>Organization Share</CardTitle>
                            <CardDescription>Distribution across groups</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.orgData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.orgData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 ml-4">
                                {stats.orgData.slice(0, 5).map((org, i) => (
                                    <div key={org.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs font-medium truncate w-32">{org.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Full History */}
                <Card className="shadow-sm border-muted-foreground/10">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            <CardTitle>Detailed Booking History</CardTitle>
                        </div>
                        <CardDescription>A complete log of all boardroom activities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportBookings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            No records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reportBookings
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((booking) => (
                                            <TableRow key={booking.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">{booking.date}</TableCell>
                                                <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                                                <TableCell>{booking.organizationName}</TableCell>
                                                <TableCell>{booking.contactName}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            booking.status === 'confirmed' ? 'default' :
                                                                booking.status === 'pending' ? 'secondary' :
                                                                    'destructive'
                                                        }
                                                        className={
                                                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
                                                        }
                                                    >
                                                        {booking.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
};

export default Reports;
