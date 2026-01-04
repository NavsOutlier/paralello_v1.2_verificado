import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TaskRepository } from '../lib/repositories/TaskRepository';
import { Task } from '../types';

/**
 * Hook to manage tasks for a specific client or organization.
 */
export const useTasks = (clientId: string | null) => {
    const { organizationId } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTasks = useCallback(async () => {
        if (!organizationId) return;

        try {
            setLoading(true);
            let fetched: Task[];

            if (clientId) {
                fetched = await TaskRepository.findByClient(clientId);
            } else {
                fetched = await TaskRepository.findByOrganization(organizationId);
            }

            setTasks(fetched);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    }, [organizationId, clientId]);

    useEffect(() => {
        fetchTasks();

        if (!organizationId) return;

        // Realtime subscription for tasks
        const channel = supabase
            .channel(`tasks-${clientId || 'all'}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tasks',
                filter: `organization_id=eq.${organizationId}`
            }, () => {
                fetchTasks();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchTasks, organizationId, clientId]);

    return {
        tasks,
        loading,
        refreshTasks: fetchTasks
    };
};
