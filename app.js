// Configuração do Supabase
const SUPABASE_URL = "https://jumfigqlnqplbpokqhvj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bWZpZ3FsbnFwbGJwb2txaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyOTE1NzIsImV4cCI6MjAyODg2NzU3Mn0.oa9VZXbP0CefDeswtrGknD03f5AfO3JJsfVUF3HXLlE";

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
        showError('Erro ao conectar com o Supabase. Verifique sua conexão.');
        return null;
    }
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Mostrar erro
function showError(message) {
    const content = document.getElementById('content');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    content.insertBefore(errorDiv, content.firstChild);
}

// Buscar última leitura
async function getLastReading() {
    const data = await fetchSupabaseData('clima?order=created_at.desc&limit=1');
    if (data && data.length > 0) {
        return data[0];
    }
    return null;
}

// Buscar recordes
async function getRecords() {
    const allData = await fetchSupabaseData('clima?order=created_at.desc');
    
    if (!allData || allData.length === 0) return null;
    
    let tempMax = { value: -Infinity, date: null };
    let tempMin = { value: Infinity, date: null };
    let humMax = { value: -Infinity, date: null };
    let humMin = { value: Infinity, date: null };
    let pressMax = { value: -Infinity, date: null };
    let pressMin = { value: Infinity, date: null };
    
    allData.forEach(reading => {
        // Temperatura
        if (reading.temperatura > tempMax.value) {
            tempMax = { value: reading.temperatura, date: reading.created_at };
        }
        if (reading.temperatura < tempMin.value) {
            tempMin = { value: reading.temperatura, date: reading.created_at };
        }
        
        // Umidade
        if (reading.umidade > humMax.value) {
            humMax = { value: reading.umidade, date: reading.created_at };
        }
        if (reading.umidade < humMin.value) {
            humMin = { value: reading.umidade, date: reading.created_at };
        }
        
        // Pressão
        if (reading.pressao > pressMax.value) {
            pressMax = { value: reading.pressao, date: reading.created_at };
        }
        if (reading.pressao < pressMin.value) {
            pressMin = { value: reading.pressao, date: reading.created_at };
        }
    });
    
    return {
        temperatura: { max: tempMax, min: tempMin },
        umidade: { max: humMax, min: humMin },
        pressao: { max: pressMax, min: pressMin }
    };
}

// Calcular médias
async function getAverages() {
    const allData = await fetchSupabaseData('clima?order=created_at.desc');
    
    if (!allData || allData.length === 0) return null;
    
    const sum = allData.reduce((acc, reading) => ({
        temperatura: acc.temperatura + reading.temperatura,
        umidade: acc.umidade + reading.umidade,
        pressao: acc.pressao + reading.pressao
    }), { temperatura: 0, umidade: 0, pressao: 0 });
    
    const count = allData.length;
    
    return {
        temperatura: (sum.temperatura / count).toFixed(1),
        umidade: (sum.umidade / count).toFixed(1),
        pressao: (sum.pressao / count).toFixed(1),
        count: count
    };
}

// Buscar 10 últimas leituras
async function getRecentReadings() {
    const data = await fetchSupabaseData('clima?order=created_at.desc&limit=10');
    return data || [];
}

// Atualizar interface com última leitura
function updateLastReading(data) {
    if (!data) return;
    
    document.getElementById('currentTemp').textContent = data.temperatura.toFixed(1);
    document.getElementById('currentHum').textContent = data.umidade.toFixed(1);
    document.getElementById('currentPress').textContent = data.pressao.toFixed(1);
    
    const formattedDate = formatDate(data.created_at);
    document.getElementById('currentTempTime').textContent = formattedDate;
    document.getElementById('currentHumTime').textContent = formattedDate;
    document.getElementById('currentPressTime').textContent = formattedDate;
}

// Atualizar interface com recordes
function updateRecords(records) {
    if (!records) return;
    
    // Temperatura
    document.getElementById('tempMax').textContent = records.temperatura.max.value.toFixed(1) + '°C';
    document.getElementById('tempMaxDate').textContent = formatDate(records.temperatura.max.date);
    document.getElementById('tempMin').textContent = records.temperatura.min.value.toFixed(1) + '°C';
    document.getElementById('tempMinDate').textContent = formatDate(records.temperatura.min.date);
    
    // Umidade
    document.getElementById('humMax').textContent = records.umidade.max.value.toFixed(1) + '%';
    document.getElementById('humMaxDate').textContent = formatDate(records.umidade.max.date);
    document.getElementById('humMin').textContent = records.umidade.min.value.toFixed(1) + '%';
    document.getElementById('humMinDate').textContent = formatDate(records.umidade.min.date);
    
    // Pressão
    document.getElementById('pressMax').textContent = records.pressao.max.value.toFixed(1) + 'hPa';
    document.getElementById('pressMaxDate').textContent = formatDate(records.pressao.max.date);
    document.getElementById('pressMin').textContent = records.pressao.min.value.toFixed(1) + 'hPa';
    document.getElementById('pressMinDate').textContent = formatDate(records.pressao.min.date);
}

// Atualizar interface com médias
function updateAverages(averages) {
    if (!averages) return;
    
    document.getElementById('avgTemp').textContent = averages.temperatura + '°C';
    document.getElementById('avgHum').textContent = averages.umidade + '%';
    document.getElementById('avgPress').textContent = averages.pressao + 'hPa';
    document.getElementById('totalReadings').textContent = averages.count;
}

// Atualizar tabela de leituras recentes
function updateRecentTable(readings) {
    const tbody = document.getElementById('recentReadings');
    
    if (!readings || readings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma leitura encontrada</td></tr>';
        return;
    }
    
    tbody.innerHTML = readings.map(reading => `
        <tr>
            <td>${formatDate(reading.created_at)}</td>
            <td>${reading.temperatura.toFixed(1)}°C</td>
            <td>${reading.umidade.toFixed(1)}%</td>
            <td>${reading.pressao.toFixed(1)} hPa</td>
        </tr>
    `).join('');
}

// Atualizar timestamp
function updateTimestamp() {
    const now = new Date();
    const formatted = formatDate(now.toISOString());
    document.getElementById('lastUpdate').textContent = `Última atualização: ${formatted}`;
}

// Carregar todos os dados
async function loadAllData() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').style.display = 'none';
        
        // Buscar todos os dados em paralelo
        const [lastReading, records, averages, recentReadings] = await Promise.all([
            getLastReading(),
            getRecords(),
            getAverages(),
            getRecentReadings()
        ]);
        
        // Atualizar interface
        updateLastReading(lastReading);
        updateRecords(records);
        updateAverages(averages);
        updateRecentTable(recentReadings);
        updateTimestamp();
        
        // Esconder loading e mostrar conteúdo
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        document.getElementById('loading').innerHTML = `
            <div class="error-message">
                ❌ Erro ao carregar dados. Verifique sua conexão com o Supabase.
                <br><br>
                <button onclick="location.reload()" class="nav-btn">🔄 Tentar Novamente</button>
            </div>
        `;
    }
}

// Inicializar ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
    
    // Atualizar automaticamente a cada 30 segundos
    setInterval(loadAllData, 30000);
});
