import { useBookings } from "@/hooks/useBookings";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Clock, Users, CalendarCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { UserManagement } from "./UserManagement";

interface PendingUser {
    id: string;
    name: string;
    email: string;
    companyName: string;
}

const API_URL = '/api/auth';

export const AdminPanel = () => {
    const { bookings, approveBooking, rejectBooking } = useBookings();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            setIsLoadingUsers(true);
            const token = localStorage.getItem('bb_token');
            const response = await fetch(`${API_URL}/pending-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setPendingUsers(data);
            } else {
                console.error('Failed to fetch pending users');
            }
        } catch (error) {
            console.error('Error fetching pending users:', error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleApproveUser = async (userId: string) => {
        try {
            const token = localStorage.getItem('bb_token');
            const response = await fetch(`${API_URL}/users/${userId}/approve`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
                toast.success("User account approved!");
            } else {
                toast.error("Failed to approve user");
            }
        } catch (error) {
            console.error('Error approving user:', error);
            toast.error("Failed to approve user");
        }
    };

    const handleRejectUser = async (userId: string) => {
        try {
            const token = localStorage.getItem('bb_token');
            const response = await fetch(`${API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
                toast.error("User account rejected");
            } else {
                toast.error("Failed to reject user");
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
            toast.error("Failed to reject user");
        }
    };

    const pendingBookings = bookings.filter((b) => b.status === "pending");

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Admin Management</h2>
                <p className="text-muted-foreground">
                    Review and authorize new user accounts and boardroom reservation requests.
                </p>
            </div>

            <Tabs defaultValue="approvals" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="approvals" className="gap-2">
                        <Users className="h-4 w-4" />
                        Account Approvals
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="gap-2">
                        <CalendarCheck className="h-4 w-4" />
                        Booking Requests
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <UserCog className="h-4 w-4" />
                        User Management
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="approvals" className="mt-6">
                    <div className="grid md:grid-cols-1 gap-8">
                {/* User Management */}
                <Card className="flex flex-col shadow-sm border-muted-foreground/10">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">Account Approvals</CardTitle>
                        </div>
                        <CardDescription>
                            Review and approve new user registrations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoadingUsers ? (
                            <div className="py-12 text-center space-y-2">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto animate-spin">
                                    <Clock className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">Loading pending users...</p>
                            </div>
                        ) : pendingUsers.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                    <Check className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">All user accounts have been processed.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingUsers.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{user.companyName}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRejectUser(user.id)}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleApproveUser(user.id)}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                    </div>
                </TabsContent>

                <TabsContent value="bookings" className="mt-6">
                    <div className="grid md:grid-cols-1 gap-8">
                {/* Booking Management */}
                <Card className="flex flex-col shadow-sm border-muted-foreground/10">
                    <CardHeader className="bg-muted/30 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarCheck className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">Booking Requests</CardTitle>
                        </div>
                        <CardDescription>
                            Approve or reject boardroom reservation requests.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {pendingBookings.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                                    <Clock className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">No pending booking requests.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Booking</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingBookings.map((booking) => (
                                        <TableRow key={booking.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{booking.organizationName}</span>
                                                    <span className="text-xs text-muted-foreground">{booking.contactName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex flex-col">
                                                    <span>{booking.date}</span>
                                                    <span className="text-xs text-muted-foreground">{booking.startTime} - {booking.endTime}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            rejectBooking(booking.id);
                                                            toast.error("Booking rejected");
                                                        }}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="icon"
                                                        className="h-8 w-8 bg-green-600 hover:bg-green-700"
                                                        onClick={() => {
                                                            approveBooking(booking.id);
                                                            toast.success("Booking approved!");
                                                        }}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                    </div>
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <UserManagement />
                </TabsContent>
            </Tabs>
        </div>
    );
};
