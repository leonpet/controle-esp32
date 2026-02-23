// Configuração do Supabase
const SUPABASE_URL = "https://jumfigqlnqplbpokqhvj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bWZpZ3FsbnFwbGJwb2txaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyOTE1NzIsImV4cCI6MjAyODg2NzU3Mn0.oa9VZXbP0CefDeswtrGknD03f5AfO3JJsfVUF3HXLlE";

// Variáveis globais
let allReadings = [];
let filteredReadings = [];
let currentPage = 1;
let itemsPerPage = 100;

// Função para buscar dados do Supabase
async function fetchSupabaseData(query) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
}

// Formatar data para horário de São Paulo (UTC-3)
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // O Supabase grava em UTC (+00)
    // Precisamos converter para UTC-3 (São Paulo)
    // Subtrair 3 horas (3 * 60 * 60 * 1000 ms)
    const saoPauloDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    
    const day = String(saoPauloDate.getUTCDate()).padStart(2, '0');
    const month = String(saoPauloDate.getUTCMonth() + 1).padStart(2, '0');
    const year = saoPauloDate.getUTCFullYear();
    const hours = String(saoPauloDate.getUTCHours()).padStart(2, '0');
    const minutes = String(saoPauloDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(saoPauloDate.getUTCSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Formatar data curta (apenas data) para horário de São Paulo
function formatDateShort(dateString) {
    const date = new Date(dateString);
    
    // Subtrair 3 horas para UTC-3
    const saoPauloDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    
    const day = String(saoPauloDate.getUTCDate()).padStart(2, '0');
    const month = String(saoPauloDate.getUTCMonth() + 1).padStart(2, '0');
    const year = saoPauloDate.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
}

// Carregar todas as leituras
async function loadAllReadings() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').style.display = 'none';
        
        // Buscar todas as leituras ordenadas por data (mais recente primeiro)
        const data = await fetchSupabaseData('clima?order=created_at.desc');
        
        if (!data || data.length === 0) {
            throw new Error('Nenhuma leitura encontrada');
        }
        
        allReadings = data;
        filteredReadings = data;
        
        updateStats();
        renderTable();
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar leituras:', error);
        document.getElementById('loading').innerHTML = `
            <div style="background: #fff3cd; padding: 20px; border-radius: 10px; color: #856404;">
                ❌ Erro ao carregar dados. Verifique sua conexão com o Supabase.
                <br><br>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Tentar Novamente</button>
            </div>
        `;
    }
}

// Atualizar estatísticas
function updateStats() {
    const total = filteredReadings.length;
    document.getElementById('totalCount').textContent = total;
    
    if (total > 0) {
        const oldest = filteredReadings[filteredReadings.length - 1].created_at;
        const newest = filteredReadings[0].created_at;
        document.getElementById('period').textContent = 
            `${formatDateShort(oldest)} - ${formatDateShort(newest)}`;
    } else {
        document.getElementById('period').textContent = '--';
    }
    
    updatePagination();
}

// Renderizar tabela
function renderTable() {
    const tbody = document.getElementById('allReadingsTable');
    
    if (filteredReadings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">Nenhuma leitura encontrada com os filtros aplicados</td></tr>';
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // Calcular índices para paginação
    let start, end;
    
    if (itemsPerPage === 'all') {
        start = 0;
        end = filteredReadings.length;
        document.getElementById('pagination').style.display = 'none';
    } else {
        start = (currentPage - 1) * itemsPerPage;
        end = Math.min(start + itemsPerPage, filteredReadings.length);
        document.getElementById('pagination').style.display = 'flex';
    }
    
    // Renderizar linhas da tabela
    const rows = filteredReadings.slice(start, end).map((reading, index) => {
        const absoluteIndex = filteredReadings.length - (start + index);
        return `
            <tr>
                <td>${absoluteIndex}</td>
                <td>${formatDate(reading.created_at)}</td>
                <td>${reading.temperatura.toFixed(1)}</td>
                <td>${reading.umidade.toFixed(1)}</td>
                <td>${reading.pressao.toFixed(1)}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
    
    // Atualizar info de exibição
    document.getElementById('showing').textContent = 
        itemsPerPage === 'all' ? 
        `Todas (${filteredReadings.length})` : 
        `${start + 1} - ${end} de ${filteredReadings.length}`;
}

// Atualizar paginação
function updatePagination() {
    if (itemsPerPage === 'all') {
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
    
    // Habilitar/desabilitar botões
    document.getElementById('firstPage').disabled = currentPage === 1;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('lastPage').disabled = currentPage === totalPages;
}

// Mudar página
function changePage(delta) {
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        updatePagination();
    }
}

// Ir para página específica
function goToPage(page) {
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
        updatePagination();
    }
}

// Ir para última página
function goToLastPage() {
    const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
    goToPage(totalPages);
}

// Aplicar filtros
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    filteredReadings = allReadings.filter(reading => {
        const readingDate = new Date(reading.created_at);
        
        if (startDate && readingDate < new Date(startDate + 'T00:00:00')) {
            return false;
        }
        
        if (endDate && readingDate > new Date(endDate + 'T23:59:59')) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    updateStats();
    renderTable();
}

// Limpar filtros
function clearFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('itemsPerPage').value = '100';
    
    filteredReadings = allReadings;
    itemsPerPage = 100;
    currentPage = 1;
    
    updateStats();
    renderTable();
}

// Event listener para mudança de itens por página
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados
    loadAllReadings();
    
    // Configurar data padrão (últimos 30 dias)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    // Não aplicar filtro de data por padrão - mostrar tudo
    // document.getElementById('startDate').value = thirtyDaysAgo.toISOString().split('T')[0];
    // document.getElementById('endDate').value = today.toISOString().split('T')[0];
    
    // Event listener para mudança de itens por página
    document.getElementById('itemsPerPage').addEventListener('change', function() {
        const value = this.value;
        itemsPerPage = value === 'all' ? 'all' : parseInt(value);
        currentPage = 1;
        renderTable();
        updatePagination();
    });
});
