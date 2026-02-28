# Black BI Frontend Implementation Plan

## Overview
Criação do módulo "Black BI" para o Paralello. Um sistema avançado de CRM baseado em Kanban focado no controle granular da jornada do cliente, operando em um modelo híbrido (IA + Humano) com métricas avançadas (SLA, CAC, LTV) e foco em centralização de dados.

## Project Type
WEB (React)

## Socratic Gate (Blockers before execution)
Esta seção contém perguntas críticas que devem ser respondidas pelo usuário antes do início do desenvolvimento. As respostas definirão a arquitetura de estado e o fluxo de telas.

## 🎨 Design Commitment (Anti-Safe Harbor)
Como Frontend Specialist, este é o compromisso de design para garantir uma interface premium, fora dos clichés comuns de SaaS:
- **Topological Choice**: `Asymmetric Data Flow`. O Kanban será uma "mesa de operação" contínua. As configurações espessas (Follow-up, Gatilhos, ICP) não serão páginas separadas, mas sim "Drawers" (Painéis Deslizantes) em camadas (z-index) que sobrepõem o Kanban de forma assimétrica para não perder o contexto.
- **Geometry**: `Sharp/Crisp (0px - 4px radius)`. Sem bordas excessivamente arredondadas. O módulo "Black BI" exige um ar técnico, cirúrgico e de altíssimo padrão.
- **Palette**: `Abyss Dark`. Fundo ultra-escuro (Slate-950/Black real) com tipografia de alto contraste.
- **Accent Colors**: `Acid Green` (Agente IA/Sucesso) e `Signal Orange` (Vendedor Humano/Atenção). **ZERO ROXO (Purple Ban ✅).**
- **Risk Factor**: Substituição da clássica quebra "Hero Split" por uma grade tática inspirada em interfaces de *Live Trading* ou HUDs focados em densidade informacional.

## Success Criteria
- [ ] Interface Kanban de performance tática com arrasto suave.
- [ ] `StageConfigDrawer`: Configuração por coluna/etapa (FollowUp, Gatilhos, ICP).
- [ ] Toggle global e individual de IA vs Humano (Auto-desativação da IA se humano intervir).
- [ ] `LeadOmniPanel`: Cartão centralizado com dados UTM/GCLID, histórico, Score, Tags e Auditoria de Conversas.
- [ ] `BlackBIMetrics`: Painel de BI contendo ciclo de vendas, atribuições de primeiro/último clique, efetividade de disparos e custos.
- [ ] `HybridTeamManager`: Gestão do SDR IA (Prompts) e Equipe de Vendas (Playbooks) e conexão de WhatsApp (instância).

## File Structure (Draft)
```text
src/components/black-bi/
├── BlackBIConsole.tsx           (Root do Módulo)
├── Kanban/
│   ├── FunnelBoard.tsx          (O Kanban)
│   ├── LeadCard.tsx             (Cartão do Lead)
│   └── StageConfigDrawer.tsx    (Config por etapa: Followup, Gatilhos, ICP)
├── LeadCRM/
│   ├── LeadOmniPanel.tsx        (Painel Expandido: Dados, Score, Campanhas)
│   └── AuditChatView.tsx        (Aba de auditoria de mensagens do Lead)
├── Analytics/
│   └── BiMetricsDashboard.tsx   (Dashboard de Origem, SLA, Ticket Médio, Custo)
└── Settings/
    ├── HybridManager.tsx        (Gestão de Vendedores vs IA + Prompts)
    └── InstanceConnection.tsx   (Conexão WhatsApp)
```

## Task Breakdown

### 1. Inicialização e Container Central
- **Agente:** `frontend-specialist`
- **INPUT:** Sidebar navigation → **OUTPUT:** `BlackBIConsole` layout master, roteamento das abas principais (Kanban, Team, Metrics) → **VERIFY:** Renderiza no `/black-bi`.

### 2. O Funil Kanban
- **Agente:** `frontend-specialist`
- **INPUT:** Mock leads → **OUTPUT:** Implementação do drag & drop, renderização das colunas (etapas) com botões de engrenagem para configuração → **VERIFY:** Cards podem ser movidos.

### 3. Engine de Configuração por Etapa (Drawers)
- **Agente:** `frontend-specialist`
- **INPUT:** Clique na configuração da etapa → **OUTPUT:** Side-panel com tabs para [Followup], [Gatilhos], e [ICP]. Toggles principais de IA/Disparos na header do Kanban → **VERIFY:** Formulários visíveis sem quebrar layout.

### 4. Gestão Híbrida (IA vs Humano) & Instância
- **Agente:** `frontend-specialist`
- **INPUT:** Aba de configuração do time → **OUTPUT:** Interface para cadastrar playbook do humano e prompt do SDR IA. Componente de conexão de Instância → **VERIFY:** Campos de Prompt e Status de conexão da instância renderizados.

### 5. Central de Dados do Lead (LeadOmniPanel) & Auditoria
- **Agente:** `frontend-specialist`
- **INPUT:** Clique no LeadCard → **OUTPUT:** Painel robusto exibindo UTMS, FBCLID, Tags, Score, e aba dedicada para Auditoria de Conversas e Histórico de Propostas → **VERIFY:** Renderiza densidade de dados limpo e acessível.

### 6. Métricas BI Avançadas
- **Agente:** `frontend-specialist`
- **INPUT:** Aba Metrics → **OUTPUT:** Gráficos rastreando origem de vendas, tempo de ciclo (SLA humano), CAC vs Ticket Médio, efetividade de mensagens → **VERIFY:** Gráficos do Recharts renderizados no estilo Dark Tech.

## Phase X: Final Verification
- [ ] **Lint:** `npm run lint` executa sem erros.
- [ ] **Design Audit:** Sem bordas arredondadas excessivas, sem roxo, sem componentes genéricos.
- [ ] **Accessibility:** Cores em contraste AAA, atalhos de teclado viáveis nos modais.
