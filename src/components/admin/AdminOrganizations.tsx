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
  const [newOrgIsTenant, setNewOrgIsTenant] = useState(false);

  const handleAddOrg = async () => {
    if (!newOrgName.trim()) return;
    try {
      await addOrganization(newOrgName.trim(), { isTenant: newOrgIsTenant });
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
    field: "monthly_free_hours",
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
          Configure BMH tenants and monthly free boardroom hours. Monthly Free Hours save when you click outside the field (blur).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-sm font-medium">Add Organization</label>
              <Input
                placeholder="Organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="new-org-tenant"
                checked={newOrgIsTenant}
                onCheckedChange={setNewOrgIsTenant}
              />
              <label htmlFor="new-org-tenant" className="text-sm font-medium whitespace-nowrap">Is tenant</label>
            </div>
            <Button onClick={handleAddOrg}>Add</Button>
          </div>
          {newOrgIsTenant && (
            <p className="text-xs text-muted-foreground">Tenant organizations get 10 free hours per month by default.</p>
          )}
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
                <TableHead>Used This Month (read-only)</TableHead>
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
                    <span className="text-xs text-muted-foreground block mt-1">Saves on blur</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {org.computed_used_hours_this_month ?? org.used_free_hours_this_month ?? 0}
                    <span className="text-xs text-muted-foreground ml-1">
                      (Remaining: {Math.max(0, (org.monthly_free_hours ?? 0) - (org.computed_used_hours_this_month ?? org.used_free_hours_this_month ?? 0))} h)
                    </span>
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

