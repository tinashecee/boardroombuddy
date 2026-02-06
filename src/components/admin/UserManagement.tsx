import { useState, useEffect } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    email: string;
    companyName: string;
    role: 'ADMIN' | 'USER';
    is_approved: boolean;
    created_at: string;
}

const API_URL = 'http://161.97.183.92:5000/api/auth';

export const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        companyName: '',
        role: 'USER' as 'ADMIN' | 'USER',
        isApproved: true,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('bb_token');
            const response = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                toast.error("Failed to fetch users");
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error("Error fetching users");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            companyName: user.companyName || '',
            role: user.role,
            isApproved: user.is_approved,
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            const token = localStorage.getItem('bb_token');
            const response = await fetch(`${API_URL}/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast.success("User updated successfully");
                setIsDialogOpen(false);
                setEditingUser(null);
                fetchUsers(); // Refresh the list
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to update user");
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error("Error updating user");
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <Card className="shadow-sm border-muted-foreground/10">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-primary" />
                    <CardTitle>User Management</CardTitle>
                </div>
                <CardDescription>
                    Manage user accounts, edit information, and change roles.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="py-12 text-center space-y-2">
                        <Loader2 className="w-12 h-12 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                        <p className="text-sm text-muted-foreground">No users found.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.companyName || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.is_approved ? 'default' : 'outline'}>
                                            {user.is_approved ? 'Approved' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(user.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleEdit(user)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                                Update user information and role.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Company Name</label>
                                <Input
                                    value={formData.companyName}
                                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    placeholder="Company name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value: 'ADMIN' | 'USER') => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USER">USER</SelectItem>
                                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Approval Status</label>
                                <Select
                                    value={formData.isApproved ? 'approved' : 'pending'}
                                    onValueChange={(value) => setFormData({ ...formData, isApproved: value === 'approved' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};
