// Author: Erasmo Cardoso - Software Engineer | Electronics Technician
package main

import (
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// IMPORTANTE: Força o WebKit e o GStreamer a ignorarem o sandbox e o portal DBus do GNOME.
	// O Snap já bloqueia acesso perigoso, o sandbox interno do WebKit causa os erros de NotAllowed no GDBus.
	os.Setenv("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1")
	os.Setenv("GIO_USE_PORTAL", "0")
	os.Setenv("GIO_USE_NETWORK_MONITOR", "base")
	os.Setenv("GST_DEBUG", "3")

	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "radiogo",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
