import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';

/**
 * Base Repository Pattern
 * 
 * Provides generic CRUD operations for all database tables.
 * Extend this class to create specific repositories for each entity.
 */
export abstract class BaseRepository<T> {
    protected supabase: SupabaseClient;
    protected tableName: string;

    constructor(tableName: string) {
        this.supabase = supabase;
        this.tableName = tableName;
    }

    /**
     * Find a single record by ID
     */
    async findById(id: string): Promise<T | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error fetching ${this.tableName} by id:`, error);
            return null;
        }

        return data as T;
    }

    /**
     * Find all records with optional filters
     */
    async findAll(filters?: Record<string, any>): Promise<T[]> {
        let query = this.supabase.from(this.tableName).select('*');

        // Apply filters if provided
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Error fetching ${this.tableName}:`, error);
            return [];
        }

        return (data as T[]) || [];
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<T | null> {
        const { data: createdData, error } = await this.supabase
            .from(this.tableName)
            .insert(data)
            .select()
            .single();

        if (error) {
            console.error(`Error creating ${this.tableName}:`, error);
            throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
        }

        return createdData as T;
    }

    /**
     * Update a record by ID
     */
    async update(id: string, data: Partial<T>): Promise<T | null> {
        const { data: updatedData, error } = await this.supabase
            .from(this.tableName)
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${this.tableName}:`, error);
            throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
        }

        return updatedData as T;
    }

    /**
     * Delete a record by ID
     */
    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting ${this.tableName}:`, error);
            throw new Error(`Failed to delete ${this.tableName}: ${error.message}`);
        }

        return true;
    }

    /**
     * Get a query builder for custom queries
     */
    query() {
        return this.supabase.from(this.tableName);
    }

    /**
     * Count records with optional filters
     */
    async count(filters?: Record<string, any>): Promise<number> {
        let query = this.supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });

        // Apply filters if provided
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });
        }

        const { count, error } = await query;

        if (error) {
            console.error(`Error counting ${this.tableName}:`, error);
            return 0;
        }

        return count || 0;
    }
}
