import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
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
import { Building2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const API_URL = '/api/auth';

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (!token) {
            setError("Invalid reset token");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsSuccess(true);
                toast.success("Password reset successfully!");
                setTimeout(() => {
                    navigate("/auth");
                }, 3000);
            } else {
                setError(data.message || "Failed to reset password");
                toast.error(data.message || "Failed to reset password");
            }
        } catch (error) {
            console.error('Error:', error);
            setError("Failed to reset password. Please try again.");
            toast.error("Failed to reset password. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center bg-no-repeat relative">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
                    <Card className="max-w-md w-full relative z-10 shadow-2xl border-muted-foreground/10">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <AlertCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Invalid Reset Link</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        This password reset link is invalid or has expired. Please request a new one.
                                    </p>
                                    <Link to="/forgot-password">
                                        <Button className="w-full">Request New Reset Link</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </div>
        );
    }

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
                        <CardTitle className="text-3xl font-bold tracking-tight">
                            {isSuccess ? "Password Reset" : "Set New Password"}
                        </CardTitle>
                        <CardDescription>
                            {isSuccess 
                                ? "Your password has been reset successfully."
                                : "Enter your new password below."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isSuccess ? (
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Password Reset Successful</h3>
                                    <p className="text-sm text-muted-foreground">
                                        You can now log in with your new password.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate("/auth")}
                                    className="w-full"
                                >
                                    Go to Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                        <p className="text-sm text-destructive">{error}</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter new password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-muted/50"
                                        minLength={6}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 6 characters
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm new password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-muted/50"
                                        minLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                    {isLoading ? "Resetting..." : "Reset Password"}
                                </Button>
                                <div className="text-center">
                                    <Link
                                        to="/auth"
                                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Back to login
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    );
};

export default ResetPassword;
