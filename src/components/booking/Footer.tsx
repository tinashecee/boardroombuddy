import { Building2 } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full py-8 px-6 bg-muted/30 border-t mt-auto">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm font-medium">BoardroomPro</span>
                </div>

                <div className="text-sm text-muted-foreground text-center">
                    BoardroomPro by <span className="font-semibold text-foreground">Soxfort Solutions</span> ({currentYear}) | <span className="font-medium">Belgravia Medical Hub</span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                </div>
            </div>
        </footer>
    );
}
