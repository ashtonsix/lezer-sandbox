package main

import (
	build "esbuild/api"
	"net/http"
)

// for local testing
func main() {
	http.HandleFunc("/", build.Handler)

	http.ListenAndServe(":3001", nil)
}
