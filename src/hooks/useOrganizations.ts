import { useState, useEffect } from 'react';

export interface Organization {
    id: string;
    name: string;
}

// Mock data for demo purposes, representing what would be fetched from MySQL
const sampleOrganizations: Organization[] = [
    { id: 'org1', name: 'Acme Corp' },
    { id: 'org2', name: 'Tech Solutions Ltd' },
    { id: 'org3', name: 'Green Energy Co' },
    { id: 'org4', name: 'Global Logistics' },
    { id: 'org5', name: 'Alpha FinTech' },
];

const API_URL = 'http://localhost:5001/api/organizations';

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

    return { organizations, isLoading, addOrganization, deleteOrganization };
}
