package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand/v2"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

type SimResult struct {
	Devices  int
	Sent     int64
	Accepted int64
	Failed   int64
	Took     time.Duration
}

// Simulate spins up N fake devices (1 goroutine each). every device sends `batches` requests of
// `perBatch` events. concurrency caps how many requests are in flight at once
func Simulate(ctx context.Context, url string, devices, batches, perBatch, concurrency int, client *http.Client) SimResult {
	start := time.Now()
	var sent, accepted, failed atomic.Int64
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	for d := 0; d < devices; d++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			rng := rand.New(rand.NewPCG(uint64(id), 42))
			device := fmt.Sprintf("device-%05d", id)
			for b := 0; b < batches; b++ {
				var body bytes.Buffer
				enc := json.NewEncoder(&body)
				for i := 0; i < perBatch; i++ {
					mult := []float64{0, 0.5, 1, 1, 2, 4}[rng.IntN(6)]
					_ = enc.Encode(Event{DeviceID: device, Kind: "attack", Pokemon: "pikachu", Damage: rng.IntN(120), Multiplier: mult})
				}
				sem <- struct{}{}
				req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, &body)
				res, err := client.Do(req)
				<-sem
				sent.Add(int64(perBatch))
				if err != nil {
					failed.Add(int64(perBatch))
					continue
				}
				var r ingestResult
				_ = json.NewDecoder(res.Body).Decode(&r)
				res.Body.Close()
				accepted.Add(int64(r.Accepted))
				failed.Add(int64(perBatch - r.Accepted))
			}
		}(d)
	}
	wg.Wait()
	return SimResult{Devices: devices, Sent: sent.Load(), Accepted: accepted.Load(), Failed: failed.Load(), Took: time.Since(start)}
}
