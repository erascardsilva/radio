// Author: Erasmo Cardoso - Software Engineer | Electronics Technician
package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed radios.json
var embeddedRadiosJSON []byte

// CountryData represents a country and its stations
type CountryData struct {
	Country  string    `json:"country"`
	Stations []Station `json:"stations"`
}

// Station represents a radio station
type Station struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Freq string `json:"freq"`
}

// App struct
type App struct {
	ctx      context.Context
	data     []CountryData
	mpvCmd   *exec.Cmd
	mpvStdin io.WriteCloser
}

// NewApp creates a new App application struct
func NewApp() *App {
	var data []CountryData
	
	// Tenta ler do arquivo local para permitir atualização manual
	fileBytes, err := os.ReadFile("radios.json")
	if err == nil {
		json.Unmarshal(fileBytes, &data)
	} else {
		// Fallback para o embed
		json.Unmarshal(embeddedRadiosJSON, &data)
	}

	return &App{data: data}
}

// startup is called when the app starts
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// IsLinux retorna true se o SO for Linux
func (a *App) IsLinux() bool {
	return goruntime.GOOS == "linux"
}

// PlayAudio inicia a reprodução nativa usando MPV (apenas no Linux/Snap)
func (a *App) PlayAudio(streamURL string) {
	if !a.IsLinux() {
		return
	}
	
	// Inicializa o processo do MPV se não estiver rodando
	if a.mpvCmd == nil {
		a.mpvCmd = exec.Command("mpv", "--idle", "--no-video", "--really-quiet")
		stdin, err := a.mpvCmd.StdinPipe()
		if err == nil {
			a.mpvStdin = stdin
			a.mpvCmd.Start()
		}
	}
	
	if a.mpvStdin != nil {
		fmt.Fprintln(a.mpvStdin, "loadfile \""+streamURL+"\"")
	}
}

// StopAudio para a reprodução no MPV
func (a *App) StopAudio() {
	if a.mpvStdin != nil {
		fmt.Fprintln(a.mpvStdin, "stop")
	}
}

// PauseAudio alterna o estado de pause do MPV
func (a *App) PauseAudio() {
	if a.mpvStdin != nil {
		fmt.Fprintln(a.mpvStdin, "cycle pause")
	}
}

// SetVolume altera o volume no MPV (0 a 100)
func (a *App) SetVolume(vol int) {
	if a.mpvStdin != nil {
		fmt.Fprintln(a.mpvStdin, fmt.Sprintf("set volume %d", vol))
	}
}

// GetCountries returns a list of available countries
func (a *App) GetCountries() []string {
	countries := []string{"Brasil (Online)", "EUA (Online)", "Portugal (Online)"}
	for _, c := range a.data {
		countries = append(countries, c.Country+" (Local)")
	}
	return countries
}

// GetStations returns a list of stations for a given country
func (a *App) GetStations(country string) []Station {
	searchCountry := ""
	if country == "Brasil (Online)" { searchCountry = "Brazil" }
	if country == "EUA (Online)" { searchCountry = "United States" }
	if country == "Portugal (Online)" { searchCountry = "Portugal" }

	if searchCountry != "" {
		apiURL := "https://de1.api.radio-browser.info/json/stations/search?country=" + url.QueryEscape(searchCountry) + "&limit=40&order=votes&reverse=true&hidebroken=true"
		
		req, _ := http.NewRequest("GET", apiURL, nil)
		req.Header.Set("User-Agent", "RetroRadioApp/1.0")
		client := &http.Client{}
		resp, err := client.Do(req)
		
		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var rbStations []struct {
				Name string `json:"name"`
				Url  string `json:"url_resolved"`
			}
			json.Unmarshal(body, &rbStations)
			
			var stations []Station
			for _, rb := range rbStations {
				stations = append(stations, Station{
					Name: rb.Name,
					URL:  rb.Url,
					Freq: "WEB",
				})
			}
			return stations
		}
	}

	localCountry := country
	if len(country) > 8 && country[len(country)-8:] == " (Local)" {
		localCountry = country[:len(country)-8]
	}

	for _, c := range a.data {
		if c.Country == localCountry {
			return c.Stations
		}
	}
	return []Station{}
}

// GetRawRadios returns the raw JSON string of radios.json
func (a *App) GetRawRadios() string {
	fileBytes, err := os.ReadFile("radios.json")
	if err == nil {
		return string(fileBytes)
	}
	return string(embeddedRadiosJSON)
}

// SaveRawRadios saves the updated JSON string back to radios.json
func (a *App) SaveRawRadios(content string) error {
	err := os.WriteFile("radios.json", []byte(content), 0644)
	if err == nil {
		// Reload data into memory
		var data []CountryData
		json.Unmarshal([]byte(content), &data)
		a.data = data
	}
	return err
}

func extractVideoID(videoURL string) string {
	if strings.Contains(videoURL, "youtu.be/") {
		parts := strings.Split(videoURL, "youtu.be/")
		if len(parts) > 1 {
			id := strings.Split(parts[1], "?")[0]
			return id
		}
	}
	if strings.Contains(videoURL, "v=") {
		parts := strings.Split(videoURL, "v=")
		if len(parts) > 1 {
			id := strings.Split(parts[1], "&")[0]
			return id
		}
	}
	return ""
}

// ResolveYouTubeAudio tenta interceptar um link do YouTube e buscar o link direto de áudio via múltiplas APIs públicas
func (a *App) ResolveYouTubeAudio(videoURL string) string {
	videoID := extractVideoID(videoURL)
	if videoID == "" {
		return videoURL
	}

	// Lista mista de instâncias do Piped e Invidious
	instances := []string{
		"https://inv.nadeko.net/api/v1/videos/",
		"https://invidious.nerdvpn.de/api/v1/videos/",
		"https://inv.tux.pizza/api/v1/videos/",
		"https://pipedapi.kavin.rocks/streams/",
		"https://pipedapi.tokhmi.xyz/streams/",
		"https://pipedapi.smnz.de/streams/",
	}

	for _, instance := range instances {
		apiURL := instance + videoID
		
		req, _ := http.NewRequest("GET", apiURL, nil)
		client := &http.Client{Timeout: 5 * time.Second}
		resp, err := client.Do(req)
		
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)

			var data struct {
				AudioStreams []struct { // Piped format
					Url string `json:"url"`
					MimeType string `json:"mimeType"`
				} `json:"audioStreams"`
				AdaptiveFormats []struct { // Invidious format
					Url string `json:"url"`
					Type string `json:"type"`
				} `json:"adaptiveFormats"`
			}

			json.Unmarshal(body, &data)

			// Tenta Extrair do Piped
			for _, stream := range data.AudioStreams {
				if strings.Contains(stream.MimeType, "audio/mp4") || strings.Contains(stream.MimeType, "webm") {
					return stream.Url
				}
			}

			// Tenta Extrair do Invidious
			for _, stream := range data.AdaptiveFormats {
				if strings.Contains(stream.Type, "audio/mp4") || strings.Contains(stream.Type, "audio/webm") {
					return stream.Url
				}
			}
		}
	}

	return videoURL // Se tudo falhar, retorna o original
}

// SelectMusicDirectory opens a dialog to pick a folder and saves it
func (a *App) SelectMusicDirectory() string {
	dir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Selecione a pasta de músicas",
	})
	if err == nil && dir != "" {
		os.WriteFile("music_dir.txt", []byte(dir), 0644)
		return dir
	}
	return ""
}

// GetSavedMusicDirectory returns the last saved directory
func (a *App) GetSavedMusicDirectory() string {
	b, err := os.ReadFile("music_dir.txt")
	if err == nil {
		return string(b)
	}
	return ""
}

// ListLocalMusics scans the directory for audio files
func (a *App) ListLocalMusics(dir string) []Station {
	var stations []Station
	files, err := os.ReadDir(dir)
	if err != nil {
		return stations
	}
	for _, f := range files {
		if !f.IsDir() {
			ext := strings.ToLower(filepath.Ext(f.Name()))
			if ext == ".mp3" || ext == ".wav" || ext == ".ogg" || ext == ".flac" || ext == ".m4a" {
				absPath := filepath.Join(dir, f.Name())
				// Remove .mp3 from display name
				displayName := strings.TrimSuffix(f.Name(), filepath.Ext(f.Name()))
				stations = append(stations, Station{
					Name: displayName,
					URL:  absPath,
					Freq: "LOCAL",
				})
			}
		}
	}
	return stations
}
