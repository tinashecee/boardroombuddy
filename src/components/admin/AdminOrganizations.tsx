import { useState } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const AdminOrganizations = () => {
  const { organizations, isLoading, addOrganization, updateOrganization } =
    useOrganizations();

  const [newOrgName, setNewOrgName] = useState("");

  const handleAddOrg = async () => {
    if (!newOrgName.trim()) return;
    try {
      await addOrganization(newOrgName.trim());
      toast.success("Organization added");
      setNewOrgName("");
    } catch {
      toast.error("Failed to add organization");
    }
  };

  const handleToggleTenant = async (id: string, current: boolean | undefined) => {
    try {
      await updateOrganization(id, { is_tenant: !current });
      toast.success("Tenant status updated");
    } catch {
      toast.error("Failed to update tenant status");
    }
  };

  const handleNumberChange = async (
    id: string,
    field: "monthly_free_hours" | "billing_rate_per_hour",
    value: string
  ) => {
    const num = value === "" ? 0 : Number(value);
    if (Number.isNaN(num)) return;
    try {
      await updateOrganization(id, { [field]: num } as any);
      toast.success("Organization updated");
    } catch {
      toast.error("Failed to update organization");
    }
  };

  return (
    <Card className="shadow-sm border-muted-foreground/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <CardTitle>Organizations & Tenant Settings</CardTitle>
        </div>
        <CardDescription>
          Configure BMH tenants, monthly free boardroom hours, and hire settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2 items-end max-w-md">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Add Organization</label>
            <Input
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
            />
          </div>
          <Button onClick={handleAddOrg}>Add</Button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading organizations...
            </p>
          </div>
        ) : organizations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No organizations configured yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Is Tenant</TableHead>
                <TableHead>Monthly Free Hours</TableHead>
                <TableHead>Used This Month</TableHead>
                <TableHead>Billing Rate / Hour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>{org.name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!org.is_tenant}
                      onCheckedChange={() =>
                        handleToggleTenant(org.id, org.is_tenant)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="w-28"
                      defaultValue={org.monthly_free_hours ?? 0}
                      onBlur={(e) =>
                        handleNumberChange(
                          org.id,
                          "monthly_free_hours",
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {org.used_free_hours_this_month ?? 0}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28"
                      defaultValue={org.billing_rate_per_hour ?? 0}
                      onBlur={(e) =>
                        handleNumberChange(
                          org.id,
                          "billing_rate_per_hour",
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

