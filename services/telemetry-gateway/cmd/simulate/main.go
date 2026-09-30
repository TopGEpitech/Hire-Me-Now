package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"time"

	"github.com/TopGEpitech/Pokedex-Nextjs14/services/telemetry-gateway/internal/gateway"
)

func main() {
	url := flag.String("url", "http://localhost:8090/ingest", "gateway ingest url")
	devices := flag.Int("devices", 10_000, "simulated devices")
	batches := flag.Int("batches", 3, "requests per device")
	perBatch := flag.Int("per-batch", 5, "events per request")
	concurrency := flag.Int("concurrency", 256, "requests in flight")
	flag.Parse()

	client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: *concurrency}}
	r := gateway.Simulate(context.Background(), *url, *devices, *batches, *perBatch, *concurrency, client)
	fmt.Printf("%d devices, %d events sent, %d accepted, %d failed in %s (%.0f events/s)\n",
		r.Devices, r.Sent, r.Accepted, r.Failed, r.Took.Round(time.Millisecond), float64(r.Accepted)/r.Took.Seconds())
}
