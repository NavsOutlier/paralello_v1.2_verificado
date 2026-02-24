// NÓ DE CÓDIGO N8N (CODE NODE) - Concatenar Paginação Meta Ads
// Cole este código em um nó "Code" logo após o seu nó HTTP Request (se não tiver ativado a paginação nativa) ou para tratar os Items paginados.

// 'items' é o array padrão de entrada do n8n
const allData = [];

for (const item of $input.all()) {
    const dataArray = item.json.data; // O Meta devolve os itens dentro de um array 'data'

    if (Array.isArray(dataArray)) {
        for (const record of dataArray) {
            // Normalização do Schema antes de enviar pro Supabase (Evitar erros de null/undefined)
            allData.push({
                json: {
                    ad_id: record.ad_id || record.id,
                    date: record.date_start,

                    // Métricas Básicas (garantir que sejam numéricas)
                    spend: parseFloat(record.spend || 0),
                    impressions: parseInt(record.impressions || 0),
                    clicks: parseInt(record.clicks || 0),
                    reach: parseInt(record.reach || 0),

                    // Métricas Complexas (Arrays de Ações)
                    actions: record.actions || [],
                    action_values: record.action_values || [],

                    // Referências de Hierarquia
                    campaign_id: record.campaign_id,
                    campaign_name: record.campaign_name,
                    adset_id: record.adset_id,
                    adset_name: record.adset_name,
                    ad_name: record.ad_name
                }
            });
        }
    }
}

// Opcional: Se precisar pegar URL de próxima página
// const pagingInfo = $input.first().json.paging;
// const nextUrl = pagingInfo && pagingInfo.next ? pagingInfo.next : null;

return allData;
