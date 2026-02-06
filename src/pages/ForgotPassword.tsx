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
import { Building2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

const API_URL = '/api/auth';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setEmailSent(true);
                toast.success(data.message);
                
                // In development, show the reset link if provided
                if (data.resetLink) {
                    console.log('Reset link:', data.resetLink);
                    toast.info(`Development mode: Reset link logged to console`);
                }
            } else {
                toast.error(data.message || "Failed to send reset email");
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error("Failed to process request. Please try again.");
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
                        <CardTitle className="text-3xl font-bold tracking-tight">Reset Password</CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!emailSent ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                    {isLoading ? "Sending..." : "Send Reset Link"}
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
                        ) : (
                            <div className="space-y-4 text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <Mail className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Check your email</h3>
                                    <p className="text-sm text-muted-foreground">
                                        We've sent a password reset link to <strong>{email}</strong>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-4">
                                        The link will expire in 1 hour. If you don't see the email, check your spam folder.
                                    </p>
                                </div>
                                <div className="pt-4 space-y-2">
                                    <Button
                                        onClick={() => {
                                            setEmailSent(false);
                                            setEmail("");
                                        }}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Send another email
                                    </Button>
                                    <Link
                                        to="/auth"
                                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <ArrowLeft className="h-3 w-3" />
                                        Back to login
                                    </Link>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    );
};

export default ForgotPassword;
