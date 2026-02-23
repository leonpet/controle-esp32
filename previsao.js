// Configuração do Supabase
const SUPABASE_URL = "https://jumfigqlnqplbpokqhvj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1bWZpZ3FsbnFwbGJwb2txaHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMyOTE1NzIsImV4cCI6MjAyODg2NzU3Mn0.oa9VZXbP0CefDeswtrGknD03f5AfO3JJsfVUF3HXLlE";

let pressureChart, humidityChart;

// Buscar dados do Supabase
async function fetchSupabaseData(query) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return null;
    }
}

// Formatar data para horário de São Paulo
function formatDate(dateString) {
    const date = new Date(dateString);
    const saoPauloDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    
    const day = String(saoPauloDate.getUTCDate()).padStart(2, '0');
    const month = String(saoPauloDate.getUTCMonth() + 1).padStart(2, '0');
    const hours = String(saoPauloDate.getUTCHours()).padStart(2, '0');
    const minutes = String(saoPauloDate.getUTCMinutes()).padStart(2, '0');
    
    return `${day}/${month} ${hours}:${minutes}`;
}

// Calcular ponto de orvalho
function calcularPontoOrvalho(temperatura, umidade) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperatura) / (b + temperatura)) + Math.log(umidade / 100);
    return (b * alpha) / (a - alpha);
}

// Sistema de Previsão Completo (Método 4)
async function previsaoCompleta() {
    try {
        // Buscar últimas 8 leituras (24 horas, considerando leituras a cada 3h)
        const leituras = await fetchSupabaseData('clima?order=created_at.desc&limit=8');
        
        if (!leituras || leituras.length < 2) {
            return {
                previsao: "❓ DADOS INSUFICIENTES",
                icone: "❓",
                confianca: 0,
                detalhes: {},
                erro: "Precisa de pelo menos 2 leituras para fazer previsão"
            };
        }
        
        const atual = leituras[0];
        const anterior3h = leituras[1];
        
        // Calcular variações
        const variacaoPressao = atual.pressao - anterior3h.pressao;
        const variacaoUmidade = atual.umidade - anterior3h.umidade;
        const variacaoTemp = atual.temperatura - anterior3h.temperatura;
        
        // Calcular ponto de orvalho
        const pontoOrvalho = calcularPontoOrvalho(atual.temperatura, atual.umidade);
        const difOrvalho = atual.temperatura - pontoOrvalho;
        
        // Variáveis de previsão
        let previsao = "";
        let icone = "";
        let confianca = 0;
        let alertas = [];
        
        // ANÁLISE DE CENÁRIOS (do mais crítico ao mais suave)
        
        // CENÁRIO 1: Tempestade Iminente
        if (variacaoPressao < -3 && atual.umidade > 85) {
            previsao = "⛈️ TEMPESTADE SEVERA";
            icone = "⛈️";
            confianca = 95;
            alertas.push({
                tipo: 'alert',
                titulo: '⚠️ ALERTA SEVERO',
                mensagem: 'Tempestade forte aproximando! Pressão caindo rapidamente.'
            });
        }
        
        // CENÁRIO 2: Tempestade
        else if (variacaoPressao < -2 && atual.umidade > 80) {
            previsao = "⛈️ TEMPESTADE nas próximas horas";
            icone = "⛈️";
            confianca = 90;
            alertas.push({
                tipo: 'warning',
                titulo: '⚠️ Atenção',
                mensagem: 'Tempestade se aproximando. Pressão em queda acentuada.'
            });
        }
        
        // CENÁRIO 3: Chuva Forte
        else if (variacaoPressao < -1.5 && atual.umidade > 75) {
            previsao = "🌧️ CHUVA FORTE provável";
            icone = "🌧️";
            confianca = 85;
        }
        
        // CENÁRIO 4: Chuva
        else if (variacaoPressao < -1 && atual.umidade > 70) {
            previsao = "🌧️ CHUVA nas próximas horas";
            icone = "🌧️";
            confianca = 75;
        }
        
        // CENÁRIO 5: Neblina/Orvalho Iminente
        else if (difOrvalho < 2 && atual.umidade > 85) {
            previsao = "🌫️ NEBLINA FORTE";
            icone = "🌫️";
            confianca = 90;
            alertas.push({
                tipo: 'warning',
                titulo: '🌫️ Alerta de Neblina',
                mensagem: 'Temperatura muito próxima do ponto de orvalho. Visibilidade reduzida.'
            });
        }
        
        // CENÁRIO 6: Possível Neblina
        else if (difOrvalho < 4 && atual.umidade > 80) {
            previsao = "🌫️ Possível NEBLINA/ORVALHO";
            icone = "🌫️";
            confianca = 75;
        }
        
        // CENÁRIO 7: Sol Forte
        else if (variacaoPressao > 2 && atual.umidade < 50) {
            previsao = "☀️ SOL FORTE predominante";
            icone = "☀️";
            confianca = 85;
        }
        
        // CENÁRIO 8: Sol
        else if (variacaoPressao > 1 && atual.umidade < 60) {
            previsao = "☀️ SOL predominante";
            icone = "☀️";
            confianca = 80;
        }
        
        // CENÁRIO 9: Tempo Melhorando
        else if (variacaoPressao > 0.5 && variacaoUmidade < -3) {
            previsao = "🌤️ Tempo MELHORANDO";
            icone = "🌤️";
            confianca = 75;
        }
        
        // CENÁRIO 10: Tempo Piorando
        else if (variacaoPressao < -0.5 && variacaoUmidade > 5) {
            previsao = "☁️ Tempo PIORANDO";
            icone = "☁️";
            confianca = 70;
        }
        
        // CENÁRIO 11: Nublado
        else if (atual.pressao < 1013 && atual.umidade > 65) {
            previsao = "☁️ NUBLADO";
            icone = "☁️";
            confianca = 65;
        }
        
        // CENÁRIO 12: Parcialmente Nublado (Bom)
        else if (atual.pressao > 1013 && atual.umidade < 70) {
            previsao = "⛅ PARCIALMENTE NUBLADO";
            icone = "⛅";
            confianca = 65;
        }
        
        // CENÁRIO 13: Parcialmente Nublado
        else if (atual.pressao >= 1010 && atual.umidade < 75) {
            previsao = "⛅ Parcialmente nublado";
            icone = "⛅";
            confianca = 60;
        }
        
        // CENÁRIO 14: Variável/Instável
        else {
            previsao = "🤷 TEMPO VARIÁVEL";
            icone = "🤷";
            confianca = 50;
        }
        
        return {
            previsao,
            icone,
            confianca,
            alertas,
            detalhes: {
                pressao: atual.pressao.toFixed(1),
                variacaoPressao: variacaoPressao.toFixed(2),
                umidade: atual.umidade.toFixed(1),
                variacaoUmidade: variacaoUmidade.toFixed(1),
                temperatura: atual.temperatura.toFixed(1),
                variacaoTemp: variacaoTemp.toFixed(1),
                pontoOrvalho: pontoOrvalho.toFixed(1),
                difOrvalho: difOrvalho.toFixed(1)
            },
            timestamp: atual.created_at,
            leituras: leituras
        };
        
    } catch (error) {
        console.error('Erro na previsão:', error);
        return {
            previsao: "❌ ERRO",
            icone: "❌",
            confianca: 0,
            detalhes: {},
            erro: error.message
        };
    }
}

// Atualizar interface
async function atualizarPrevisao() {
    try {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('content').style.display = 'none';
        
        const resultado = await previsaoCompleta();
        
        if (resultado.erro) {
            throw new Error(resultado.erro);
        }
        
        // Previsão principal
        document.getElementById('forecastIcon').textContent = resultado.icone;
        document.getElementById('forecastText').textContent = resultado.previsao;
        document.getElementById('forecastConfidence').textContent = 
            `Confiança: ${resultado.confianca}%`;
        document.getElementById('forecastTime').textContent = 
            `Atualizado em: ${formatDate(resultado.timestamp)}`;
        
        // Alertas
        const alertsDiv = document.getElementById('alerts');
        if (resultado.alertas && resultado.alertas.length > 0) {
            alertsDiv.innerHTML = resultado.alertas.map(alerta => `
                <div class="${alerta.tipo}-box">
                    <div class="${alerta.tipo}-title">${alerta.titulo}</div>
                    <div>${alerta.mensagem}</div>
                </div>
            `).join('');
        } else {
            alertsDiv.innerHTML = '';
        }
        
        // Detalhes
        const det = resultado.detalhes;
        document.getElementById('detailPressure').textContent = det.pressao + ' hPa';
        document.getElementById('detailPressureTrend').innerHTML = 
            getTrendText(parseFloat(det.variacaoPressao), 'hPa', 'pressão');
        
        document.getElementById('detailHumidity').textContent = det.umidade + '%';
        document.getElementById('detailHumidityTrend').innerHTML = 
            getTrendText(parseFloat(det.variacaoUmidade), '%', 'umidade');
        
        document.getElementById('detailTemp').textContent = det.temperatura + '°C';
        document.getElementById('detailTempTrend').innerHTML = 
            getTrendText(parseFloat(det.variacaoTemp), '°C', 'temperatura');
        
        document.getElementById('detailDewPoint').textContent = det.pontoOrvalho + '°C';
        document.getElementById('detailDewPointTrend').textContent = 
            `Diferença: ${det.difOrvalho}°C da temperatura`;
        
        // Indicadores
        atualizarIndicadores(resultado);
        
        // Gráficos
        atualizarGraficos(resultado.leituras);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao atualizar previsão:', error);
        document.getElementById('loading').innerHTML = `
            <div style="background: #f8d7da; padding: 20px; border-radius: 10px; color: #721c24;">
                ❌ Erro: ${error.message}
                <br><br>
                <button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 Tentar Novamente</button>
            </div>
        `;
    }
}

// Texto de tendência
function getTrendText(value, unit, tipo) {
    let arrow, className, text;
    
    if (value > 0.1) {
        arrow = '⬆️';
        className = tipo === 'pressão' ? 'trend-up' : 'trend-up';
        text = `Subindo: +${value}${unit} nas últimas 3h`;
    } else if (value < -0.1) {
        arrow = '⬇️';
        className = tipo === 'pressão' ? 'trend-down' : 'trend-down';
        text = `Caindo: ${value}${unit} nas últimas 3h`;
    } else {
        arrow = '➡️';
        className = 'trend-stable';
        text = `Estável: ${value}${unit}`;
    }
    
    return `<span class="${className}">${arrow} ${text}</span>`;
}

// Atualizar indicadores
function atualizarIndicadores(resultado) {
    const det = resultado.detalhes;
    const indicators = [];
    
    // Índice de Conforto
    const conforto = calcularConforto(parseFloat(det.temperatura), parseFloat(det.umidade));
    indicators.push({
        icon: conforto.icon,
        label: 'Conforto Térmico',
        value: conforto.texto
    });
    
    // Probabilidade de Chuva
    const probChuva = calcularProbChuva(parseFloat(det.variacaoPressao), parseFloat(det.umidade));
    indicators.push({
        icon: probChuva > 70 ? '🌧️' : probChuva > 40 ? '☁️' : '☀️',
        label: 'Prob. de Chuva',
        value: probChuva + '%'
    });
    
    // Risco de Neblina
    const riscoNeblina = parseFloat(det.difOrvalho) < 4 ? 'ALTO' : 
                        parseFloat(det.difOrvalho) < 6 ? 'MÉDIO' : 'BAIXO';
    indicators.push({
        icon: '🌫️',
        label: 'Risco de Neblina',
        value: riscoNeblina
    });
    
    // Tendência Geral
    const tendencia = parseFloat(det.variacaoPressao) > 0.5 ? 'Melhorando' : 
                      parseFloat(det.variacaoPressao) < -0.5 ? 'Piorando' : 'Estável';
    indicators.push({
        icon: tendencia === 'Melhorando' ? '📈' : tendencia === 'Piorando' ? '📉' : '➡️',
        label: 'Tendência',
        value: tendencia
    });
    
    document.getElementById('indicators').innerHTML = indicators.map(ind => `
        <div class="indicator-card">
            <div class="indicator-icon">${ind.icon}</div>
            <div class="indicator-label">${ind.label}</div>
            <div class="indicator-value">${ind.value}</div>
        </div>
    `).join('');
}

// Calcular conforto térmico
function calcularConforto(temp, umid) {
    if (temp < 18) return { icon: '🥶', texto: 'Frio' };
    if (temp > 26 && umid > 70) return { icon: '🥵', texto: 'Abafado' };
    if (temp > 28) return { icon: '🌡️', texto: 'Quente' };
    if (temp >= 20 && temp <= 26 && umid >= 40 && umid <= 70) return { icon: '😊', texto: 'Ideal' };
    if (temp >= 18 && temp <= 28) return { icon: '👍', texto: 'Agradável' };
    return { icon: '🤔', texto: 'Variável' };
}

// Calcular probabilidade de chuva
function calcularProbChuva(varPressao, umidade) {
    let prob = 0;
    
    if (varPressao < -2) prob += 40;
    else if (varPressao < -1) prob += 25;
    else if (varPressao < -0.5) prob += 15;
    
    if (umidade > 85) prob += 30;
    else if (umidade > 75) prob += 20;
    else if (umidade > 65) prob += 10;
    
    return Math.min(prob, 95);
}

// Atualizar gráficos
function atualizarGraficos(leituras) {
    const labels = leituras.slice().reverse().map(l => formatDate(l.created_at));
    
    // Gráfico de Pressão
    const ctxPressure = document.getElementById('pressureChart').getContext('2d');
    if (pressureChart) pressureChart.destroy();
    
    pressureChart = new Chart(ctxPressure, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pressão (hPa)',
                data: leituras.slice().reverse().map(l => l.pressao),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
    
    // Gráfico de Umidade e Ponto de Orvalho
    const ctxHumidity = document.getElementById('humidityChart').getContext('2d');
    if (humidityChart) humidityChart.destroy();
    
    humidityChart = new Chart(ctxHumidity, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Umidade (%)',
                    data: leituras.slice().reverse().map(l => l.umidade),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Ponto de Orvalho (°C)',
                    data: leituras.slice().reverse().map(l => 
                        calcularPontoOrvalho(l.temperatura, l.umidade)
                    ),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    atualizarPrevisao();
    
    // Atualizar a cada 1 minuto
    setInterval(atualizarPrevisao, 60000);
});
