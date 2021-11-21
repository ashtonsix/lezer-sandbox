package api

import (
	"net/http"

	"github.com/evanw/esbuild/pkg/api"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	src := r.URL.Query()["src"]

	if len(src) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	w.Header().Set("Cache-Control", "s-maxage=2419200")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/javascript")
	result := api.Transform(src[0], api.TransformOptions{
		Format:     api.FormatIIFE,
		GlobalName: "exports",
	})

	w.Write(result.Code)
}
