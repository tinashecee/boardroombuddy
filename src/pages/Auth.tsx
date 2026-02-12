import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Footer } from "@/components/booking/Footer";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Auth = () => {
    const { login, signup } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const { organizations, isLoading: orgsLoading } = useOrganizations();

    // Form states
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [companyName, setCompanyName] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                toast.success("Welcome back!");
                navigate("/");
            } else {
                toast.error(result.error || "Invalid credentials. Please try again.");
            }
        } catch (error) {
            toast.error("Failed to login. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // If organizations exist, companyName must be selected
            if (organizations.length > 0 && !companyName) {
                toast.error("Please select your organization.");
                setIsLoading(false);
                return;
            }
            const result = await signup(name, email, companyName, password);
            if (result.success) {
                toast.success("Account created! Please wait for admin approval before logging in.");
                // Don't navigate - user must wait for approval
                // Clear form
                setName("");
                setEmail("");
                setCompanyName("");
                setPassword("");
            } else {
                toast.error(result.error || "Signup failed. That email might already be in use.");
            }
        } catch (error) {
            toast.error("Failed to create account.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat relative">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

                <Card className="max-w-md w-full relative z-10 shadow-2xl border-muted-foreground/10">
                    <CardHeader className="space-y-1 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <Building2 className="h-8 w-8 text-primary-foreground" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">BoardroomPro</CardTitle>
                        <CardDescription>
                            Shared boardroom management at Belgravia Medical Hub
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login" className="space-y-4">
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@company.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <Link
                                            to="/forgot-password"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                        {isLoading ? "Signing in..." : "Sign In"}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup" className="space-y-4">
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name">Full Name</Label>
                                        <Input
                                            id="signup-name"
                                            placeholder="John Doe"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <Input
                                            id="signup-email"
                                            type="email"
                                            placeholder="name@company.com"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-company">Organization</Label>
                                        {organizations.length > 0 ? (
                                            <Select
                                                value={companyName}
                                                onValueChange={setCompanyName}
                                                disabled={orgsLoading}
                                            >
                                                <SelectTrigger id="signup-company" className="bg-muted/50">
                                                    <SelectValue placeholder={orgsLoading ? "Loading organizations..." : "Select organization"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {organizations.map((org) => (
                                                        <SelectItem key={org.id} value={org.name}>
                                                            {org.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id="signup-company"
                                                placeholder="Organization name"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="bg-muted/50"
                                            />
                                        )}
                                        {organizations.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No organizations configured yet. You can enter your organization name for now.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <Input
                                            id="signup-password"
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="bg-muted/50"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                        {isLoading ? "Creating account..." : "Create Account"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    );
};

export default Auth;
