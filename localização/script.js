// ============= FIREBASE CONFIGURATION =============
// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6qAxX6YoWUCrO1ibPcJ3yOAKhqkQFTdI",
  authDomain: "localizacao-1680d.firebaseapp.com",
  projectId: "localizacao-1680d",
  storageBucket: "localizacao-1680d.firebasestorage.app",
  messagingSenderId: "1097659155123",
  appId: "1:1097659155123:web:5f5a65c656436ea27ee6c6",
  measurementId: "G-56L9X6B1K3",
  databaseURL: "https://localizacao-1680d-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============= ROTA COM IBMEC CAMPUS BARRA =============
// Rota do ônibus na Barra da Tijuca - Rio de Janeiro
const rota = [
    { lat: -23.0003, lng: -43.3657, nome: "Terminal Alvorada" },
    { lat: -22.9985, lng: -43.3612, nome: "Shopping Barra" },
    { lat: -22.9958, lng: -43.3550, nome: "Via Parque" },
    { lat: -22.9920, lng: -43.3480, nome: "Barra Square" },
    { lat: -22.9885, lng: -43.3420, nome: "Av. das Américas, 5000" },
    { lat: -23.0112, lng: -43.3620, nome: "IBMEC Campus Barra - Instituição de Ensino" },
    { lat: -22.9850, lng: -43.3350, nome: "Rio Design Barra" },
    { lat: -22.9815, lng: -43.3280, nome: "Parque Olímpico" },
    { lat: -22.9780, lng: -43.3200, nome: "Barra da Tijuca - Praia" }
];

let indice = 0;
let mapa;
let marcador;
let rotaPolyline;

// ============= FUNÇÃO PARA INICIALIZAR O MAPA COM LEAFLET =============
function inicializarMapa() {
    const pontoCentral = rota[0];
    
    // Criar mapa com Leaflet
    mapa = L.map("mapa").setView([pontoCentral.lat, pontoCentral.lng], 13);
    
    // Adicionar tile do OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapa);
    
    // Criar marcador para o ônibus
    marcador = L.marker([pontoCentral.lat, pontoCentral.lng], {
        icon: L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/2992/2992563.png",
            iconSize: [40, 40],
            popupAnchor: [0, -15]
        })
    }).addTo(mapa).bindPopup("Ônibus - " + pontoCentral.nome);
    
    // Desenhar a rota
    const coordenadas = rota.map(ponto => [ponto.lat, ponto.lng]);
    rotaPolyline = L.polyline(coordenadas, {
        color: "#667eea",
        weight: 3,
        opacity: 0.7,
        dashArray: "5, 5"
    }).addTo(mapa);
    
    // Adicionar marcadores para todos os pontos da rota
    rota.forEach((ponto, index) => {
        const cor = index === 5 ? "red" : "blue"; // IBMEC em vermelho
        L.circleMarker([ponto.lat, ponto.lng], {
            radius: 6,
            fillColor: cor,
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(mapa).bindPopup(ponto.nome);
    });
    
    console.log("✓ Mapa inicializado com sucesso!");
    salvarPosicaoNoFirebase(pontoCentral);
}

// ============= FUNÇÕES DO FIREBASE =============
// Função para salvar a posição atual no Firebase
function salvarPosicaoNoFirebase(ponto) {
    const posicaoRef = ref(database, "onibus/posicao");
    const dados = {
        latitude: ponto.lat,
        longitude: ponto.lng,
        local: ponto.nome,
        horario: new Date().toISOString(),
        indice: indice
    };
    
    // Salvar no Firebase
    import { update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
    update(posicaoRef.parent, { "onibus/posicao": dados })
        .then(() => console.log("✓ Posição salva no Firebase:", ponto.nome))
        .catch(error => console.error("✗ Erro ao salvar:", error));
}

// Função para enviar localização para Firebase Realtime Database
function enviarLocalizacaoIBMEC() {
    const ibmec = rota[5]; // IBMEC Campus Barra é o índice 5
    const locRef = ref(database, "localizacoes/ibmec");
    
    import { set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
    set(locRef, {
        nome: "IBMEC Campus Barra",
        latitude: ibmec.lat,
        longitude: ibmec.lng,
        endereco: "Av. Lúcio Costa, 2000 - Barra da Tijuca, Rio de Janeiro - RJ",
        atualizado: new Date().toISOString()
    }).then(() => {
        console.log("✓ Localização IBMEC atualizada no banco de dados!");
    }).catch(error => {
        console.error("✗ Erro ao atualizar IBMEC:", error);
    });
}

// Função para monitorar mudanças no Firebase em tempo real
function monitorarPosicoes() {
    const posicaoRef = ref(database, "onibus/posicao");
    onValue(posicaoRef, (snapshot) => {
        if (snapshot.exists()) {
            const dados = snapshot.val();
            console.log("📍 Posição atualizada:", dados);
            document.getElementById("posicao").innerHTML = dados.local || "Carregando...";
        }
    }, (error) => {
        console.error("Erro ao monitorar posições:", error);
    });
}

// ============= FUNÇÃO PARA MOVER O ÔNIBUS =============
function moverOnibus() {
    indice = (indice + 1) % rota.length;
    const ponto = rota[indice];
    
    // Atualizar marcador com Leaflet
    marcador.setLatLng([ponto.lat, ponto.lng]);
    marcador.setPopupContent("Ônibus - " + ponto.nome);
    
    // Centralizar mapa
    mapa.setView([ponto.lat, ponto.lng], 13);
    
    // Atualizar texto da posição
    document.getElementById("posicao").innerHTML = ponto.nome;
    
    // Salvar no Firebase
    salvarPosicaoNoFirebase(ponto);
    
    // Se chegar no IBMEC, atualizar localização especial
    if (indice === 5) {
        enviarLocalizacaoIBMEC();
    }
    
    console.log("🚌 Ônibus movido para: " + ponto.nome);
}

// Aguarda a página carregar para conectar o botão e inicializar
document.addEventListener("DOMContentLoaded", function() {
    // Inicializar mapa ao carregar
    if (document.getElementById("mapa")) {
        inicializarMapa();
        monitorarPosicoes();
    }
    
    // Conectar botão de movimento
    const botao = document.getElementById("btn-mover");
    if (botao) {
        botao.addEventListener("click", moverOnibus);
    }
});

// Torna a função inicializarMapa global
window.inicializarMapa = inicializarMapa;