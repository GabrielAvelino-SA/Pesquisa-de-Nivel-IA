/* =========================================================
   CONTEÚDO DA PESQUISA
   - dimensions: eixos avaliados (aparecem no radar)
   - levels: faixas de nível pelo score geral (0–100)
   - questions: perguntas, na ordem em que aparecem
       type: 'single' | 'multi' | 'scale' | 'text'
       dimension: id da dimensão (pontua) ou null (perfil / insight, não pontua)
       points: 0 a 4 em cada opção (multi soma e limita a 4)
   - tips: recomendações por dimensão e faixa (low < 40, mid < 70, high)
   ========================================================= */
window.SURVEY = {
  dimensions: [
    { id: 'conhecimento', label: 'Conhecimento de IA', short: 'Conhecimento', icon: '🧠', color: '#a78bfa' },
    { id: 'ferramentas', label: 'Uso de Ferramentas', short: 'Ferramentas', icon: '🛠️', color: '#22d3ee' },
    { id: 'automacao', label: 'Automação', short: 'Automação', icon: '⚙️', color: '#34d399' },
    { id: 'dados', label: 'Dados & Análise', short: 'Dados', icon: '📊', color: '#fbbf24' },
    { id: 'etica', label: 'Segurança & Ética', short: 'Segurança', icon: '🛡️', color: '#f472b6' },
    { id: 'mentalidade', label: 'Mentalidade de Inovação', short: 'Inovação', icon: '🚀', color: '#fb7185' },
  ],

  levels: [
    { n: 1, min: 0, name: 'Explorador', emoji: '🌱', color: '#94a3b8',
      desc: 'Você está no início da jornada. A IA ainda é pouco presente na sua rotina — e isso é uma grande oportunidade de ganhar tempo e qualidade.' },
    { n: 2, min: 20, name: 'Aprendiz', emoji: '🔍', color: '#22d3ee',
      desc: 'Você já tem contato com IA e automação, mas de forma pontual. Com prática guiada, vai dar um salto rápido.' },
    { n: 3, min: 40, name: 'Praticante', emoji: '⚡', color: '#34d399',
      desc: 'A IA já faz parte do seu trabalho. O próximo passo é usar com mais método, segurança e transformar tarefas repetitivas em automações.' },
    { n: 4, min: 60, name: 'Avançado', emoji: '🚀', color: '#a78bfa',
      desc: 'Você usa IA e automação com consistência e senso crítico. Está pronto para resolver problemas maiores do seu setor.' },
    { n: 5, min: 80, name: 'Catalisador', emoji: '🌟', color: '#f472b6',
      desc: 'Você é referência! Domina ferramentas, automatiza processos e pode multiplicar esse conhecimento pelo time.' },
  ],

  questions: [
    /* ---------------- PERFIL (não pontua) ---------------- */
    {
      id: 'nome', type: 'text', dimension: null, section: 'Sobre você', optional: true,
      title: 'Como podemos te chamar?',
      subtitle: 'Opcional. Usamos só para personalizar seu resultado.',
      placeholder: 'Seu nome (opcional)', input: 'line',
    },
    {
      id: 'area', type: 'single', dimension: null, section: 'Sobre você',
      title: 'Em qual área você trabalha?',
      options: [
        { label: 'Loja / Operação', emoji: '🏪' },
        { label: 'Comercial / Compras', emoji: '🛒' },
        { label: 'Logística / CD', emoji: '🚚' },
        { label: 'Financeiro / Contábil', emoji: '💰' },
        { label: 'RH / Gente & Gestão', emoji: '🤝' },
        { label: 'Marketing', emoji: '📣' },
        { label: 'TI / Sistemas', emoji: '💻' },
        { label: 'Outra área', emoji: '✳️' },
      ],
    },
    {
      id: 'cargo', type: 'single', dimension: null, section: 'Sobre você',
      title: 'Qual é o seu nível de cargo?',
      options: [
        { label: 'Operacional', emoji: '🧩' },
        { label: 'Assistente / Analista / Técnico', emoji: '📋' },
        { label: 'Supervisão / Coordenação', emoji: '🧭' },
        { label: 'Gerência', emoji: '🎯' },
        { label: 'Diretoria', emoji: '🏛️' },
      ],
    },

    /* ---------------- CONHECIMENTO ---------------- */
    {
      id: 'entendimento_ia', type: 'single', dimension: 'conhecimento',
      title: 'Como você descreve seu entendimento sobre IA generativa?',
      subtitle: 'Ex.: ChatGPT, Claude, Gemini.',
      options: [
        { label: 'Nunca ouvi falar direito', points: 0, emoji: '😶' },
        { label: 'Já ouvi falar, mas nunca usei', points: 1, emoji: '👂' },
        { label: 'Já usei algumas vezes para coisas simples', points: 2, emoji: '🙂' },
        { label: 'Uso com frequência e conheço as limitações', points: 3, emoji: '😎' },
        { label: 'Entendo bem como funciona e já ensinei outras pessoas', points: 4, emoji: '🧑‍🏫' },
      ],
    },
    {
      id: 'cenario_alucinacao', type: 'single', dimension: 'conhecimento',
      scenario: 'Você pediu para a IA o faturamento de um concorrente e ela respondeu um número exato, com muita confiança.',
      title: 'O que você faz com essa informação?',
      options: [
        { label: 'Pergunto de novo para a IA se ela tem certeza', points: 2, emoji: '🔁' },
        { label: 'Uso no relatório — ela respondeu com certeza', points: 0, emoji: '✅' },
        { label: 'Desconfio: a IA pode inventar dados. Busco uma fonte confiável', points: 4, emoji: '🕵️' },
        { label: 'Não sei bem o que faria', points: 1, emoji: '🤷' },
      ],
    },

    /* ---------------- FERRAMENTAS ---------------- */
    {
      id: 'ferramentas_usadas', type: 'multi', dimension: 'ferramentas',
      title: 'Quais destas ferramentas da empresa você já usou?',
      subtitle: 'Marque todas que você já usou pelo menos uma vez.',
      options: [
        { label: 'ChatGPT', points: 1, emoji: '💬' },
        { label: 'Claude', points: 1, emoji: '🧡' },
        { label: 'Gemini', points: 1, emoji: '✨' },
        { label: 'Lovable (criar apps e telas com IA)', points: 1.5, emoji: '💜' },
        { label: 'n8n (fluxos de automação)', points: 1.5, emoji: '🔗' },
        { label: 'Nenhuma delas', points: 0, emoji: '🚫', exclusive: true },
      ],
    },
    {
      id: 'frequencia_uso', type: 'scale', dimension: 'ferramentas',
      title: 'Com que frequência você usa IA no seu trabalho?',
      labels: ['Nunca', 'Raramente', 'Toda semana', 'Todo dia', 'Várias vezes ao dia'],
      emojis: ['💤', '🐢', '🚶', '🏃', '⚡'],
    },
    {
      id: 'prompts', type: 'single', dimension: 'ferramentas',
      title: 'Como você costuma pedir algo para a IA?',
      options: [
        { label: 'Não uso IA', points: 0, emoji: '—' },
        { label: 'Frases curtas, como uma busca no Google', points: 1, emoji: '🔎' },
        { label: 'Explico o que quero com alguns detalhes', points: 2, emoji: '✍️' },
        { label: 'Dou contexto, exemplos e o formato da resposta', points: 3, emoji: '🧱' },
        { label: 'Crio assistentes personalizados (Projetos no Claude, GPTs, Gems)', points: 4, emoji: '🤖' },
      ],
    },

    /* ---------------- AUTOMAÇÃO ---------------- */
    {
      id: 'tempo_repetitivo', type: 'single', dimension: null, section: 'Oportunidades',
      title: 'Quanto do seu dia vai para tarefas repetitivas?',
      subtitle: 'Copiar e colar, planilhas iguais toda semana, relatórios manuais, conferências…',
      options: [
        { label: 'Quase nada', emoji: '🟢' },
        { label: 'Até 1 hora', emoji: '🟡' },
        { label: 'De 1 a 3 horas', emoji: '🟠' },
        { label: 'Mais de 3 horas', emoji: '🔴' },
      ],
    },
    {
      id: 'ja_automatizou', type: 'single', dimension: 'automacao',
      title: 'Até onde você já foi automatizando seu trabalho?',
      options: [
        { label: 'Nunca automatizei nada', points: 0, emoji: '✋' },
        { label: 'Uso fórmulas básicas no Excel (soma, média)', points: 1, emoji: '➕' },
        { label: 'PROCV/PROCX, tabelas dinâmicas ou macros gravadas', points: 2, emoji: '🧮' },
        { label: 'Monto fluxos simples no n8n ou crio telas no Lovable', points: 3, emoji: '🔗' },
        { label: 'Crio fluxos no n8n com IA, APIs ou integrações entre sistemas', points: 4, emoji: '🦾' },
      ],
    },
    {
      id: 'cenario_relatorio', type: 'single', dimension: 'automacao',
      scenario: 'Toda segunda-feira você gasta 2 horas juntando 3 planilhas para montar o mesmo relatório.',
      title: 'Qual seria sua atitude?',
      options: [
        { label: 'Continuo fazendo — faz parte do trabalho', points: 0, emoji: '😮‍💨' },
        { label: 'Peço para a IA me ajudar a criar fórmulas ou uma macro', points: 3, emoji: '🤖' },
        { label: 'Procuro alguém da TI para ver se dá para automatizar', points: 2, emoji: '🙋' },
        { label: 'Eu mesmo monto uma automação (n8n, Power Query, script)', points: 4, emoji: '🛠️' },
        { label: 'Tento fazer mais rápido, com atalhos de teclado', points: 1, emoji: '⌨️' },
      ],
    },

    /* ---------------- DADOS ---------------- */
    {
      id: 'ferramenta_dados', type: 'single', dimension: 'dados',
      title: 'Qual destas melhor descreve como você trabalha com dados?',
      options: [
        { label: 'Não trabalho com dados', points: 0, emoji: '—' },
        { label: 'Consulto relatórios prontos do sistema', points: 1, emoji: '📄' },
        { label: 'Uso Excel com filtros e fórmulas', points: 2, emoji: '📗' },
        { label: 'Tabelas dinâmicas, Power Query, dashboards', points: 3, emoji: '📊' },
        { label: 'Power BI, SQL ou Python', points: 4, emoji: '🧪' },
      ],
    },

    /* ---------------- ÉTICA / SEGURANÇA ---------------- */
    {
      id: 'cenario_lgpd', type: 'single', dimension: 'etica',
      scenario: 'Você precisa resumir uma planilha com nome, CPF e telefone de clientes.',
      title: 'Como você usaria a IA nessa tarefa?',
      options: [
        { label: 'Colo a planilha inteira em uma IA gratuita', points: 0, emoji: '📋' },
        { label: 'Removo os dados pessoais (anonimizo) ou uso a ferramenta aprovada pela empresa', points: 4, emoji: '🔐' },
        { label: 'Apago só algumas colunas e colo o resto', points: 1, emoji: '✂️' },
        { label: 'Pergunto à TI ou ao gestor antes de usar', points: 3, emoji: '🙋' },
      ],
    },
    {
      id: 'revisa_conteudo', type: 'scale', dimension: 'etica',
      title: 'Você revisa o que a IA gerou antes de enviar ou usar?',
      labels: ['Nunca', 'Raramente', 'Às vezes', 'Quase sempre', 'Sempre'],
      emojis: ['🙈', '😬', '🤔', '👀', '🔍'],
    },

    /* ---------------- MENTALIDADE ---------------- */
    {
      id: 'nova_ferramenta', type: 'single', dimension: 'mentalidade',
      title: 'Quando surge uma nova ferramenta de IA, você…',
      options: [
        { label: 'Espero alguém pedir para eu usar', points: 0, emoji: '⏳' },
        { label: 'Fico curioso, mas não testo', points: 1, emoji: '🤔' },
        { label: 'Testo quando sobra tempo', points: 2, emoji: '🧪' },
        { label: 'Testo logo e aplico no meu trabalho', points: 3, emoji: '⚡' },
        { label: 'Testo, aplico e compartilho com o time', points: 4, emoji: '📢' },
      ],
    },
    {
      id: 'melhoria', type: 'single', dimension: 'mentalidade',
      title: 'Você já propôs ou criou alguma melhoria com IA ou automação?',
      options: [
        { label: 'Nunca pensei nisso', points: 0, emoji: '💭' },
        { label: 'Tenho ideias, mas não compartilhei', points: 1, emoji: '💡' },
        { label: 'Já sugeri para meu gestor ou time', points: 2, emoji: '🗣️' },
        { label: 'Já implementei para o meu próprio trabalho', points: 3, emoji: '🧰' },
        { label: 'Já implementei e o time todo usa', points: 4, emoji: '🏆' },
      ],
    },

    /* ---------------- FECHAMENTO (não pontua) ---------------- */
    {
      id: 'desejo_ia', type: 'text', dimension: null, section: 'Sua opinião', optional: true,
      title: 'Qual tarefa do seu dia você adoraria que a IA fizesse por você?',
      subtitle: 'Opcional, mas muito valioso: suas ideias viram projetos.',
      placeholder: 'Ex.: montar o relatório de quebras toda segunda, responder e-mails de fornecedores…',
      input: 'area',
    },
  ],

  /* =========================================================
     TURMAS DA OFICINA DE IA & AUTOMAÇÃO
     Cada colaborador entra na turma pela faixa do score geral.
     Dimensões abaixo de 40 viram "módulos de reforço" individuais.
     ========================================================= */
  tracks: [
    { id: 'T1', name: 'Primeiros Passos', emoji: '🌱', min: 0, color: '#94a3b8', duracao: '2 encontros de 2h',
      objetivo: 'Perder o medo e começar a usar IA com segurança no dia a dia.',
      conteudos: ['O que é IA generativa, o que ela faz bem e onde erra', 'Conhecendo ChatGPT, Claude e Gemini e o uso seguro (LGPD)',
        'Primeiros prompts: e-mails, resumos e listas', 'Prática guiada com tarefas reais do setor'] },
    { id: 'T2', name: 'IA no Dia a Dia', emoji: '⚡', min: 40, color: '#22d3ee', duracao: '3 encontros de 2h',
      objetivo: 'Usar IA com método para ganhar tempo em tarefas recorrentes.',
      conteudos: ['Prompts estruturados: Papel + Contexto + Tarefa + Formato', 'Projetos no Claude, GPTs e Gems com contexto do setor',
        'IA + Excel: fórmulas, análises e limpeza de dados', 'Validação de respostas e anonimização de dados'] },
    { id: 'T3', name: 'Automação na Prática', emoji: '🚀', min: 60, color: '#a78bfa', duracao: '4 encontros de 2h + projeto',
      objetivo: 'Transformar processos repetitivos em automações.',
      conteudos: ['n8n na prática: gatilhos, planilhas, e-mail e IA no fluxo', 'Lovable: protótipos de telas e ferramentas internas',
        'Agentes de IA conectados a dados da empresa', 'Projeto: automatizar um processo real do setor'] },
    { id: 'T4', name: 'Multiplicadores', emoji: '🌟', min: 80, color: '#f472b6', duracao: 'Mentoria contínua',
      objetivo: 'Liderar projetos de IA e apoiar as outras turmas como monitores.',
      conteudos: ['n8n avançado: APIs, integrações com sistemas e agentes', 'Governança e boas práticas de IA na empresa',
        'Como facilitar oficinas e mentorar colegas', 'Roadmap de casos de uso por área'] },
  ],

  tips: {
    conhecimento: {
      low: ['Faça uma trilha introdutória de IA generativa (30 min): o que ela faz bem e o que não faz.', 'Teste a mesma pergunta escrita de 3 jeitos diferentes e compare as respostas.'],
      mid: ['Entenda o que é “alucinação” e crie o hábito de validar dados com uma fonte.', 'Aprenda por que dar contexto e exemplos melhora tanto as respostas.'],
      high: ['Explore agentes de IA e RAG (IA consultando documentos da empresa).', 'Seja multiplicador: apresente um caso de uso real para o seu time.'],
    },
    ferramentas: {
      low: ['Escolha uma ferramenta (ChatGPT, Claude ou Gemini) e use 1 vez por dia durante 2 semanas.', 'Comece pelo simples: revisar e-mails, resumir textos, montar listas.'],
      mid: ['Use a estrutura Papel + Contexto + Tarefa + Formato nos seus prompts.', 'Crie um Projeto no Claude (ou um GPT/Gem) com o contexto do seu setor.'],
      high: ['Use o Lovable para prototipar uma ferramenta interna do seu setor.', 'Combine IA com Excel e Power BI para análises mais rápidas.'],
    },
    automacao: {
      low: ['Liste 3 tarefas que você repete toda semana: elas são candidatas a automação.', 'Aprenda PROCX e tabelas dinâmicas no Excel.'],
      mid: ['Monte seu primeiro fluxo no n8n: planilha → resumo com IA → e-mail.', 'Peça para a IA escrever fórmulas e macros por você.'],
      high: ['Mapeie processos do setor e proponha automações no n8n com ganho de horas estimado.', 'Explore integrações via API e agentes de IA no n8n junto com a TI.'],
    },
    dados: {
      low: ['Domine filtros, classificação e gráficos básicos no Excel.', 'Antes de decidir, pergunte: “qual dado sustenta isso?”'],
      mid: ['Avance em tabelas dinâmicas e Power Query.', 'Peça para a IA interpretar tabelas e sugerir insights (sem dados sensíveis).'],
      high: ['Construa dashboards no Power BI para o seu setor.', 'Aprenda SQL básico para consultar os dados direto na fonte.'],
    },
    etica: {
      low: ['Nunca cole dados pessoais (CPF, telefone, salário) em IAs públicas.', 'Peça ao seu gestor ou à TI a política de uso de IA e LGPD.'],
      mid: ['Pratique anonimizar dados antes de usar IA.', 'Revise e confira os fatos antes de compartilhar algo gerado por IA.'],
      high: ['Ajude a espalhar boas práticas de segurança no seu time.', 'Contribua com a governança: sugira regras e ferramentas aprovadas.'],
    },
    mentalidade: {
      low: ['Reserve 15 minutos por semana para testar algo novo com IA.', 'Converse com um colega que já usa IA e peça um exemplo prático.'],
      mid: ['Transforme uma ideia em piloto: teste por 2 semanas e meça o tempo economizado.', 'Compartilhe suas descobertas com o time.'],
      high: ['Lidere um mini-projeto de IA no seu setor.', 'Seja mentor de colegas que estão começando.'],
    },
  },
};
