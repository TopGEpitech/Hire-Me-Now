package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/TopGEpitech/Pokedex-Nextjs14/services/telemetry-gateway/internal/gateway"
)

// events go to stdout as NDJSON. pipe them into the python anomaly service:
//
//	go run ./cmd/gateway | python -m anomaly.detect
func main() {
	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8090"
	}
	g := gateway.New(gateway.DefaultConfig(), gateway.NewNDJSONSink(os.Stdout))
	srv := &http.Server{Addr: addr, Handler: g.Handler(), ReadHeaderTimeout: 5 * time.Second}

	go func() {
		log.Printf("telemetry gateway on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	// graceful stop: finish in-flight requests, then flush the last batch
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	g.Close()
}
