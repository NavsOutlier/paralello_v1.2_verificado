import { BaseRepository } from './BaseRepository';

export interface DistortionLayout {
    id?: string;
    organization_id: string;
    entity_id: string;
    positions: Record<string, { x: number, y: number }>;
    labels: any[];
    updated_at?: string;
}

export class DistortionRepository extends BaseRepository<DistortionLayout> {
    constructor() {
        super('distortion_layouts');
    }

    async findByEntity(organizationId: string, entityId: string): Promise<DistortionLayout | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('organization_id', organizationId)
            .eq('entity_id', entityId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching distortion layout:', error);
            return null;
        }

        return data;
    }

    async upsertLayout(layout: DistortionLayout): Promise<DistortionLayout | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .upsert(
                {
                    organization_id: layout.organization_id,
                    entity_id: layout.entity_id,
                    positions: layout.positions,
                    labels: layout.labels,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'organization_id,entity_id' }
            )
            .select()
            .single();

        if (error) {
            console.error('Error upserting distortion layout:', error);
            return null;
        }

        return data;
    }
}

export const distortionRepository = new DistortionRepository();
