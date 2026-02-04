import { Header } from "@/components/booking/Header";
import { Footer } from "@/components/booking/Footer";
import { useOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Building2, Plus, Trash2, ChevronLeft, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Settings = () => {
    const { organizations, addOrganization, deleteOrganization } = useOrganizations();
    const [newOrgName, setNewOrgName] = useState("");
    const navigate = useNavigate();

    const handleAddOrg = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrgName.trim()) return;

        // Check if duplicate
        if (organizations.some(org => org.name.toLowerCase() === newOrgName.trim().toLowerCase())) {
            toast.error("This organization already exists.");
            return;
        }

        addOrganization(newOrgName.trim());
        setNewOrgName("");
        toast.success("Organization added successfully!");
    };

    const handleDeleteOrg = (id: string, name: string) => {
        if (confirm(`Are you sure you want to remove ${name}?`)) {
            deleteOrganization(id);
            toast.success("Organization removed.");
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="container mx-auto px-4 py-8 space-y-8 animate-fade-in flex-1">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                        <p className="text-muted-foreground">
                            Manage global configurations and registered organizations.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Organization Form */}
                    <Card className="lg:col-span-1 shadow-sm border-muted-foreground/10 h-fit">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                <CardTitle>Add Organization</CardTitle>
                            </div>
                            <CardDescription>Register a new group for boardroom access.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddOrg} className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="e.g. Acme Health Hub"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        className="bg-muted/50"
                                    />
                                </div>
                                <Button type="submit" className="w-full gap-2">
                                    <Plus className="h-4 w-4" />
                                    Add Organization
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Organizations List */}
                    <Card className="lg:col-span-2 shadow-sm border-muted-foreground/10">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                <CardTitle>Registered Organizations</CardTitle>
                            </div>
                            <CardDescription>View and manage organizations that can book the boardroom.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Organization Name</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organizations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                                                No organizations registered.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        organizations.map((org) => (
                                            <TableRow key={org.id} className="hover:bg-muted/30">
                                                <TableCell className="font-medium">{org.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteOrg(org.id, org.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Settings;
