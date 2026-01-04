import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChecklistTemplate, ChecklistItem } from '../types';

/**
 * Hook to manage checklist templates.
 */
export const useChecklists = () => {
    const { organizationId } = useAuth();
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTemplates = useCallback(async () => {
        if (!organizationId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('checklist_templates')
                .select('*')
                .eq('organization_id', organizationId);

            if (error) throw error;

            setTemplates((data || []).map(t => ({
                id: t.id,
                name: t.name,
                items: t.items,
                organizationId: t.organization_id,
                createdAt: t.created_at
            })));
        } catch (error) {
            console.error('Error fetching checklist templates:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    const createTemplate = async (name: string, items: ChecklistItem[]) => {
        if (!organizationId) return;
        const { data, error } = await supabase
            .from('checklist_templates')
            .insert({ name, items, organization_id: organizationId })
            .select()
            .single();

        if (error) throw error;
        if (data) {
            setTemplates(prev => [...prev, {
                id: data.id,
                name: data.name,
                items: data.items,
                organizationId: data.organization_id,
                createdAt: data.created_at
            }]);
        }
    };

    const deleteTemplate = async (id: string) => {
        const { error } = await supabase
            .from('checklist_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return {
        templates,
        loading,
        createTemplate,
        deleteTemplate,
        refreshTemplates: fetchTemplates
    };
};
