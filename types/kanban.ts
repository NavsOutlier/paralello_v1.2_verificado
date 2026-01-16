/**
 * Kanban Domain Types
 */

export interface KanbanStage {
    id: string;
    organization_id: string;
    name: string;
    color: string;
    order_index: number;
    is_system: boolean;
    created_at: string;
    updated_at: string;
}
