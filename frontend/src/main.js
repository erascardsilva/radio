// Author: Erasmo Cardoso - Software Engineer | Electronics Technician
import './style.css';
import { GetCountries, GetStations, GetRawRadios, SaveRawRadios, ResolveYouTubeAudio, SelectMusicDirectory, GetSavedMusicDirectory, ListLocalMusics } from '../wailsjs/go/main/App.js';
import { BrowserOpenURL, ClipboardGetText } from '../wailsjs/runtime/runtime.js';

let audioPlayer;
let countrySelect;
let stationSelect;
let volumeSlider;
let muteBtn;
let lcdFreq;
let lcdStationName;

let currentStations = [];
let localStations = [];
let currentRadiosData = [];
let currentPlayingStationData = null;
let favoritesList = JSON.parse(localStorage.getItem("radiogo_favorites") || "[]");

let currentLang = "pt";
const i18n = {
    "pt": {
        "subtitle": "Sintonize suas estações favoritas",
        "btn_lista": "☰ Lista",
        "btn_musicas": "📁 Músicas",
        "btn_favs": "⭐ Favoritos",
        "btn_apoie": "☕ Apoie",
        "btn_sobre": "ℹ️ Sobre",
        "modal_music_title": "Músicas Locais",
        "modal_fav_title": "Favoritos",
        "no_favorites": "Nenhum favorito salvo.",
        "btn_choose_folder": "Escolher Pasta",
        "no_folder": "Nenhuma pasta selecionada ou vazia.",
        "btn_close": "Fechar",
        "modal_radio_title": "Gerenciar Rádios",
        "placeholder_region": "Região (Ex: Brasil)",
        "placeholder_name": "Nome da Rádio",
        "placeholder_url": "URL do Stream",
        "btn_add": "Adicionar",
        "modal_about_title": "Sobre o radiogo",
        "about_text": "Este é um Media Center híbrido. Você pode escutar rádios do mundo todo, colar links de áudio do YouTube e também escutar suas músicas MP3 locais direto do seu computador.",
        "label_region": "Região",
        "label_station": "Estação",
        "label_stream": "Stream Manual (URL)",
        "btn_play": "Tocar",
        "label_volume": "Volume",
        "opt_select": "Selecione...",
        "opt_local": "📁 Músicas Locais (MP3)",
        "opt_wait": "Aguardando",
        "opt_change_dir": "[ 🔄 Trocar Pasta de Músicas ]",
        "app_name": "radiogo"
    },
    "en": {
        "subtitle": "Tune in to your favorite stations",
        "btn_lista": "☰ List",
        "btn_musicas": "📁 Music",
        "btn_favs": "⭐ Favorites",
        "btn_apoie": "☕ Support",
        "btn_sobre": "ℹ️ About",
        "modal_music_title": "Local Music",
        "modal_fav_title": "Favorites",
        "no_favorites": "No saved favorites.",
        "btn_choose_folder": "Choose Folder",
        "no_folder": "No folder selected or empty.",
        "btn_close": "Close",
        "modal_radio_title": "Manage Radios",
        "placeholder_region": "Region (Ex: USA)",
        "placeholder_name": "Radio Name",
        "placeholder_url": "Stream URL",
        "btn_add": "Add",
        "modal_about_title": "About radiogo",
        "about_text": "This is a hybrid Media Center. You can listen to radios from all over the world, paste YouTube audio links, and also listen to your local MP3 music straight from your computer.",
        "label_region": "Region",
        "label_station": "Station",
        "label_stream": "Manual Stream (URL)",
        "btn_play": "Play",
        "label_volume": "Volume",
        "opt_select": "Select...",
        "opt_local": "📁 Local Music (MP3)",
        "opt_wait": "Waiting",
        "opt_change_dir": "[ 🔄 Change Music Folder ]",
        "app_name": "radiogo"
    }
};

function translatePage() {
    const dict = i18n[currentLang];
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) el.innerText = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (dict[key]) el.placeholder = dict[key];
    });
    
    // Refresh dropdowns if necessary
    loadCountries();
}

document.addEventListener("DOMContentLoaded", async () => {
    audioPlayer = document.getElementById("audio-player");
    countrySelect = document.getElementById("country-select");
    stationSelect = document.getElementById("station-select");
    volumeSlider = document.getElementById("volume-slider");
    muteBtn = document.getElementById("mute-btn");
    lcdFreq = document.getElementById("lcd-freq");
    lcdStationName = document.getElementById("lcd-station-name");

    const listaBtn = document.getElementById("lista-btn");
    const listaModal = document.getElementById("lista-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    
    const sobreBtn = document.getElementById("sobre-btn");
    const sobreModal = document.getElementById("sobre-modal");
    const closeSobreBtn = document.getElementById("close-sobre-btn");
    
    const favBtn = document.getElementById("fav-btn");
    const favModal = document.getElementById("fav-modal");
    const closeFavBtn = document.getElementById("close-fav-btn");
    const favListContainer = document.getElementById("fav-list-container");
    const btnFavorite = document.getElementById("btn-favorite");
    
    const langBtn = document.getElementById("lang-btn");
    const apoieBtn = document.getElementById("apoie-btn");

    // Permite colar com o botão direito em qualquer input
    document.querySelectorAll("input[type='text']").forEach(input => {
        input.addEventListener("contextmenu", async (e) => {
            e.preventDefault();
            try {
                const text = await ClipboardGetText();
                if (text) {
                    input.value = text;
                }
            } catch (err) {
                console.error("Erro ao colar com botão direito:", err);
            }
        });
    });

    apoieBtn.addEventListener("click", () => {
        BrowserOpenURL("https://www.paypal.com/ncp/payment/8V6WQCGN6HDCQ");
    });

    langBtn.addEventListener("click", () => {
        currentLang = currentLang === "pt" ? "en" : "pt";
        translatePage();
    });

    sobreBtn.addEventListener("click", () => {
        sobreModal.classList.remove("hidden");
    });
    
    closeSobreBtn.addEventListener("click", () => {
        sobreModal.classList.add("hidden");
    });

    favBtn.addEventListener("click", () => {
        renderFavorites();
        favModal.classList.remove("hidden");
    });

    closeFavBtn.addEventListener("click", () => {
        favModal.classList.add("hidden");
    });

    btnFavorite.addEventListener("click", () => {
        if (!currentPlayingStationData) return;
        const isFav = favoritesList.some(f => f.url === currentPlayingStationData.url);
        if (isFav) {
            favoritesList = favoritesList.filter(f => f.url !== currentPlayingStationData.url);
        } else {
            favoritesList.push(currentPlayingStationData);
        }
        localStorage.setItem("radiogo_favorites", JSON.stringify(favoritesList));
        updateFavoriteIcon();
        renderFavorites();
    });
    
    // Controles de Mídia
    const btnPrev = document.getElementById("btn-prev");
    const btnPlayPause = document.getElementById("btn-playpause");
    const btnNext = document.getElementById("btn-next");

    let currentPlayingList = [];
    let currentPlayingIndex = -1;

    btnPlayPause.addEventListener("click", () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });

    audioPlayer.addEventListener("play", () => btnPlayPause.innerText = "⏸");
    audioPlayer.addEventListener("pause", () => btnPlayPause.innerText = "▶");

    function skipStation(direction) {
        if (!currentPlayingList || currentPlayingList.length === 0) return;
        if (currentPlayingIndex === -1) return;

        let nextIdx = currentPlayingIndex + direction;
        if (nextIdx < 0) nextIdx = currentPlayingList.length - 1;
        if (nextIdx >= currentPlayingList.length) nextIdx = 0;

        currentPlayingIndex = nextIdx;
        const nextStation = currentPlayingList[nextIdx];
        
        if (currentPlayingList === currentStations) {
            stationSelect.value = nextIdx;
        }

        playStation(nextStation);
    }

    btnPrev.addEventListener("click", () => skipStation(-1));
    btnNext.addEventListener("click", () => skipStation(1));

    // Auto-play próximo MP3
    audioPlayer.addEventListener("ended", () => {
        // Se estiver tocando MP3 (tem freq === "LOCAL" ou undefined)
        skipStation(1);
    });

    const radiosListContainer = document.getElementById("radios-list-container");
    const newCountry = document.getElementById("new-country");
    const newName = document.getElementById("new-name");
    const newUrl = document.getElementById("new-url");
    const addRadioBtn = document.getElementById("add-radio-btn");
    const pasteNewUrlBtn = document.getElementById("paste-new-url-btn");

    pasteNewUrlBtn.addEventListener("click", async () => {
        try {
            const text = await ClipboardGetText();
            if (text) newUrl.value = text;
        } catch(e) {
            console.error("Erro ao colar:", e);
        }
    });

    const localBtn = document.getElementById("local-btn");
    const localModal = document.getElementById("local-modal");
    const closeLocalModalBtn = document.getElementById("close-local-modal-btn");
    const selectDirBtn = document.getElementById("select-dir-btn");
    const localMusicListContainer = document.getElementById("local-music-list-container");

    // --- Músicas Locais ---
    localBtn.addEventListener("click", async () => {
        localModal.classList.remove("hidden");
        await reloadLocalMusic();
    });

    closeLocalModalBtn.addEventListener("click", () => {
        localModal.classList.add("hidden");
    });

    selectDirBtn.addEventListener("click", async () => {
        const dir = await SelectMusicDirectory();
        if (dir) {
            await reloadLocalMusic();
        }
    });

    async function reloadLocalMusic() {
        const savedDir = await GetSavedMusicDirectory();
        if (!savedDir) {
            localMusicListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhuma pasta selecionada.</p>';
            return;
        }

        localStations = await ListLocalMusics(savedDir);
        localMusicListContainer.innerHTML = '';
        
        if (!localStations || localStations.length === 0) {
            localMusicListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 20px;">Nenhum áudio encontrado nesta pasta.</p>';
            return;
        }

        localStations.forEach((station, idx) => {
            const item = document.createElement("div");
            item.className = "radio-list-item";
            item.style.cursor = "pointer";
            
            const info = document.createElement("div");
            info.className = "radio-info";
            info.innerHTML = `<span class="radio-name">${station.name}</span><span class="radio-country">Arquivo Local</span>`;
            
            const playBtn = document.createElement("button");
            playBtn.className = "btn-primary";
            playBtn.innerText = "Tocar";
            playBtn.style.padding = "6px 12px";
            
            item.onclick = () => {
                currentPlayingList = localStations;
                currentPlayingIndex = idx;
                playStation(station);
                localModal.classList.add("hidden");
            };

            item.appendChild(info);
            item.appendChild(playBtn);
            localMusicListContainer.appendChild(item);
        });
    }
    // A opção de MP3 foi movida para o seletor de região principal para melhor usabilidade

    listaBtn.addEventListener("click", async () => {
        try {
            const rawJson = await GetRawRadios();
            if (rawJson) {
                currentRadiosData = JSON.parse(rawJson);
            } else {
                currentRadiosData = [];
            }
        } catch(e) {
            console.error("Erro ao carregar json de rádios:", e);
            currentRadiosData = [];
        }
        renderRadiosList();
        listaModal.classList.remove("hidden");
    });

    closeModalBtn.addEventListener("click", () => {
        listaModal.classList.add("hidden");
    });

    function renderRadiosList() {
        radiosListContainer.innerHTML = '';
        currentRadiosData.forEach((countryGroup, countryIndex) => {
            countryGroup.stations.forEach((station, stationIndex) => {
                const item = document.createElement("div");
                item.className = "radio-list-item";
                
                const info = document.createElement("div");
                info.className = "radio-info";
                info.innerHTML = `<span class="radio-name">${station.name}</span><span class="radio-country">${countryGroup.country}</span>`;
                
                const deleteBtn = document.createElement("button");
                deleteBtn.className = "delete-btn";
                deleteBtn.innerText = "Remover";
                deleteBtn.onclick = async () => {
                    countryGroup.stations.splice(stationIndex, 1);
                    if (countryGroup.stations.length === 0) {
                        currentRadiosData.splice(countryIndex, 1);
                    }
                    await saveAndReload();
                };

                item.appendChild(info);
                item.appendChild(deleteBtn);
                radiosListContainer.appendChild(item);
            });
        });
    }

    addRadioBtn.addEventListener("click", async () => {
        const c = newCountry.value.trim();
        const n = newName.value.trim();
        const u = newUrl.value.trim();
        
        if (!c || !n || !u) {
            alert("Preencha Região, Nome e URL!");
            return;
        }

        let countryGroup = currentRadiosData.find(g => g.country.toLowerCase() === c.toLowerCase());
        if (!countryGroup) {
            countryGroup = { country: c, stations: [] };
            currentRadiosData.push(countryGroup);
        }

        countryGroup.stations.push({ name: n, url: u, freq: "---" });
        
        newCountry.value = "";
        newName.value = "";
        newUrl.value = "";
        
        await saveAndReload();
    });

    async function saveAndReload() {
        await SaveRawRadios(JSON.stringify(currentRadiosData, null, 2));
        renderRadiosList();
        await loadCountries();
    }

    // Configurar Volume Inicial
    audioPlayer.volume = volumeSlider.value / 100;

    // Eventos
    volumeSlider.addEventListener("input", (e) => {
        audioPlayer.volume = e.target.value / 100;
        if(audioPlayer.muted && audioPlayer.volume > 0) {
            audioPlayer.muted = false;
            muteBtn.innerText = "🔊";
        }
    });

    muteBtn.addEventListener("click", () => {
        audioPlayer.muted = !audioPlayer.muted;
        muteBtn.innerText = audioPlayer.muted ? "🔇" : "🔊";
    });

    countrySelect.addEventListener("change", async (e) => {
        await loadStations(e.target.value);
    });

    stationSelect.addEventListener("change", async (e) => {
        const value = e.target.value;
        if(value === "CHANGE_DIR") {
            const dir = await SelectMusicDirectory();
            if (dir) {
                await loadStations("LOCAL_MP3");
            }
            return;
        }
        if(value !== "") {
            currentPlayingList = currentStations;
            currentPlayingIndex = parseInt(value);
            playStation(currentStations[value]);
        }
    });

    const customUrlInput = document.getElementById("custom-url");
    const playCustomBtn = document.getElementById("play-custom-btn");
    const pasteCustomBtn = document.getElementById("paste-custom-btn");

    pasteCustomBtn.addEventListener("click", async () => {
        try {
            const text = await ClipboardGetText();
            if (text) customUrlInput.value = text;
        } catch(e) {
            console.error("Erro ao colar:", e);
        }
    });

    playCustomBtn.addEventListener("click", () => {
        const url = customUrlInput.value.trim();
        if(url) {
            currentPlayingList = [];
            currentPlayingIndex = -1;
            playStation({ name: "Stream Manual", url: url, freq: "---" });
        }
    });

    // Iniciar Carregamento
    await loadCountries();
});

async function loadCountries() {
    try {
        const countries = await GetCountries();
        const dict = i18n[currentLang];
        countrySelect.innerHTML = `<option value="">${dict["opt_select"]}</option>`;
        countries.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.innerText = c;
            countrySelect.appendChild(opt);
        });
        
        // Adiciona a Opção Local diretamente na lista
        const optLocal = document.createElement("option");
        optLocal.value = "LOCAL_MP3";
        optLocal.innerText = dict["opt_local"];
        countrySelect.appendChild(optLocal);

    } catch (err) {
        console.error("Erro ao carregar países:", err);
    }
}

async function loadStations(country) {
    const dict = i18n[currentLang];
    
    if(!country) {
        stationSelect.innerHTML = `<option value="">${dict["opt_select"]}</option>`;
        return;
    }

    if (country === "LOCAL_MP3") {
        let savedDir = await GetSavedMusicDirectory();
        if (!savedDir) {
            savedDir = await SelectMusicDirectory();
        }
        
        if (savedDir) {
            currentStations = await ListLocalMusics(savedDir);
            stationSelect.innerHTML = `<option value="">${dict["opt_select"]}</option>`;
            
            const changeDirOpt = document.createElement("option");
            changeDirOpt.value = "CHANGE_DIR";
            changeDirOpt.innerText = dict["opt_change_dir"];
            stationSelect.appendChild(changeDirOpt);
            
            currentStations.forEach((s, idx) => {
                const opt = document.createElement("option");
                opt.value = idx;
                opt.innerText = s.name;
                stationSelect.appendChild(opt);
            });
            lcdFreq.innerText = "LOCAL";
            lcdStationName.innerText = "Músicas Prontas";
        } else {
            stationSelect.innerHTML = '<option value="">Nenhuma pasta selecionada</option>';
            countrySelect.value = "";
        }
        audioPlayer.pause();
        return;
    }

    try {
        currentStations = await GetStations(country);
        stationSelect.innerHTML = `<option value="">${dict["opt_select"]}</option>`;
        currentStations.forEach((s, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.innerText = s.name;
            stationSelect.appendChild(opt);
        });
        
        lcdFreq.innerText = "---";
        lcdStationName.innerText = dict["opt_wait"];
        audioPlayer.pause();
    } catch (err) {
        console.error("Erro ao carregar rádios:", err);
    }
}

async function playStation(station) {
    currentPlayingStationData = station;
    updateFavoriteIcon();

    lcdFreq.innerText = station.freq || "WEB";
    lcdStationName.innerText = "Conectando...";
    
    try {
        const finalUrl = await ResolveYouTubeAudio(station.url);
        audioPlayer.src = finalUrl;
        await audioPlayer.play();
        lcdStationName.innerText = station.name;
    } catch(err) {
        console.error("Erro ao reproduzir:", err);
        lcdStationName.innerText = "Erro ao Tocar";
    }
}

function updateFavoriteIcon() {
    const btnFavorite = document.getElementById("btn-favorite");
    if (!btnFavorite) return;
    if (!currentPlayingStationData) {
        btnFavorite.innerText = "🤍";
        btnFavorite.style.color = "rgba(255,255,255,0.3)";
        return;
    }
    const isFav = favoritesList.some(f => f.url === currentPlayingStationData.url);
    if (isFav) {
        btnFavorite.innerText = "💛";
        btnFavorite.style.color = "var(--primary)";
        btnFavorite.style.opacity = "1";
    } else {
        btnFavorite.innerText = "🤍";
        btnFavorite.style.color = "rgba(255,255,255,0.3)";
        btnFavorite.style.opacity = "0.8";
    }
}

function renderFavorites() {
    const favListContainer = document.getElementById("fav-list-container");
    if (!favListContainer) return;
    
    favListContainer.innerHTML = "";
    
    if (favoritesList.length === 0) {
        const dict = i18n[currentLang];
        favListContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 20px;" data-i18n="no_favorites">${dict["no_favorites"] || 'Nenhum favorito salvo.'}</p>`;
        return;
    }
    
    favoritesList.forEach(fav => {
        const item = document.createElement("div");
        item.className = "radio-item";
        item.innerHTML = `
            <div class="radio-info" style="flex: 1;">
                <div class="radio-name">${fav.name}</div>
                <div class="radio-freq">${fav.freq || 'WEB'}</div>
            </div>
            <div class="radio-actions" style="display: flex; gap: 8px;">
                <button class="btn-primary play-fav-btn" style="padding: 4px 12px; font-size: 0.9rem;" title="Tocar">▶</button>
                <button class="btn-secondary delete-fav-btn" style="padding: 4px 12px; font-size: 0.9rem;" title="Remover">🗑️</button>
            </div>
        `;
        
        item.querySelector(".play-fav-btn").addEventListener("click", () => {
            playStation(fav);
            document.getElementById("fav-modal").classList.add("hidden");
        });
        
        item.querySelector(".delete-fav-btn").addEventListener("click", () => {
            favoritesList = favoritesList.filter(f => f.url !== fav.url);
            localStorage.setItem("radiogo_favorites", JSON.stringify(favoritesList));
            renderFavorites();
            updateFavoriteIcon();
        });
        
        favListContainer.appendChild(item);
    });
}

