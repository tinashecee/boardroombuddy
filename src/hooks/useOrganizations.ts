import { useState, useEffect } from 'react';

export interface Organization {
    id: string;
    name: string;
    is_tenant?: boolean;
    monthly_free_hours?: number;
    used_free_hours_this_month?: number;
    billing_rate_per_hour?: number | null;
}

const API_URL = '/api/organizations';

export function useOrganizations() {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchOrgs = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to fetch organizations');
            const data = await response.json();
            setOrganizations(data);
        } catch (error) {
            console.error('Error loading organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    const addOrganization = async (name: string) => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error('Failed to add organization');
            const newOrg = await response.json();
            setOrganizations(prev => [...prev, newOrg]);
            return newOrg;
        } catch (error) {
            console.error('Error adding organization:', error);
            throw error;
        }
    };

    const updateOrganization = async (
        id: string,
        updates: Partial<Pick<Organization, 'name' | 'is_tenant' | 'monthly_free_hours' | 'used_free_hours_this_month' | 'billing_rate_per_hour'>>
    ) => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (!response.ok) throw new Error('Failed to update organization');
            const updated = await response.json();
            setOrganizations(prev => prev.map(org => (org.id === id ? updated : org)));
            return updated as Organization;
        } catch (error) {
            console.error('Error updating organization:', error);
            throw error;
        }
    };

    const deleteOrganization = async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete organization');
            setOrganizations(prev => prev.filter(org => org.id !== id));
        } catch (error) {
            console.error('Error deleting organization:', error);
            throw error;
        }
    };

    return { organizations, isLoading, addOrganization, updateOrganization, deleteOrganization };
}
