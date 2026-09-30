package gateway

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"
)

type Config struct {
	BatchSize     int           // flush when the batch gets this big
	FlushEvery    time.Duration // ...or after this long, whatever comes first
	MaxLines      int           // per request
	PerDeviceRate float64       // events/second each device can send (token bucket)
	Burst         float64
}

func DefaultConfig() Config {
	return Config{BatchSize: 500, FlushEvery: 200 * time.Millisecond, MaxLines: 500, PerDeviceRate: 50, Burst: 100}
}

type Gateway struct {
	cfg     Config
	sink    Sink
	in      chan Event
	buckets sync.Map // deviceId -> *bucket
	alerts  *Hub
	now     func() time.Time
	done    chan struct{}

	accepted, rejected, limited, flushErrors atomic.Int64
}

func New(cfg Config, sink Sink) *Gateway {
	g := &Gateway{cfg: cfg, sink: sink, in: make(chan Event, cfg.BatchSize*4), alerts: NewHub(), now: time.Now, done: make(chan struct{})}
	go g.batcher()
	return g
}

// Close flushes what's left + stops the batcher
func (g *Gateway) Close() {
	close(g.in)
	<-g.done
}

func (g *Gateway) Alerts() *Hub { return g.alerts }

func (g *Gateway) batcher() {
	defer close(g.done)
	batch := make([]Event, 0, g.cfg.BatchSize)
	tick := time.NewTicker(g.cfg.FlushEvery)
	defer tick.Stop()

	flush := func() {
		if len(batch) == 0 {
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if err := g.sink.Publish(ctx, batch); err != nil {
			g.flushErrors.Add(1)
		}
		cancel()
		batch = make([]Event, 0, g.cfg.BatchSize)
	}

	for {
		select {
		case e, ok := <-g.in:
			if !ok {
				flush()
				return
			}
			batch = append(batch, e)
			if len(batch) >= g.cfg.BatchSize {
				flush()
			}
		case <-tick.C:
			flush()
		}
	}
}

// token bucket per device. 1 noisy device can't eat everyone else's throughput
type bucket struct {
	mu     sync.Mutex
	tokens float64
	last   time.Time
}

func (g *Gateway) allow(device string) bool {
	v, _ := g.buckets.LoadOrStore(device, &bucket{tokens: g.cfg.Burst, last: g.now()})
	b := v.(*bucket)
	b.mu.Lock()
	defer b.mu.Unlock()
	now := g.now()
	b.tokens = min(g.cfg.Burst, b.tokens+now.Sub(b.last).Seconds()*g.cfg.PerDeviceRate)
	b.last = now
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

type ingestResult struct {
	Accepted    int      `json:"accepted"`
	Rejected    int      `json:"rejected"`
	RateLimited int      `json:"rateLimited"`
	Errors      []string `json:"errors,omitempty"`
}

// POST /ingest, body = NDJSON (1 event per line). bad lines are skipped + reported, good ones go through
func (g *Gateway) handleIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	res := ingestResult{}
	sc := bufio.NewScanner(r.Body)
	line := 0
	for sc.Scan() {
		line++
		if line > g.cfg.MaxLines {
			http.Error(w, fmt.Sprintf("max %d lines per request", g.cfg.MaxLines), http.StatusRequestEntityTooLarge)
			return
		}
		var e Event
		if err := json.Unmarshal(sc.Bytes(), &e); err != nil || e.Validate() != nil {
			res.Rejected++
			if len(res.Errors) < 5 {
				res.Errors = append(res.Errors, fmt.Sprintf("line %d: invalid event", line))
			}
			continue
		}
		if !g.allow(e.DeviceID) {
			res.RateLimited++
			continue
		}
		if e.At.IsZero() {
			e.At = g.now()
		}
		g.in <- e
		res.Accepted++
		// a 4x hit is worth telling the dashboard about, right now
		if e.Kind == "attack" && e.Multiplier >= 4 {
			g.alerts.Broadcast(Alert{DeviceID: e.DeviceID, Message: fmt.Sprintf("%s landed a 4x hit (%d dmg)", e.Pokemon, e.Damage)})
		}
	}
	g.accepted.Add(int64(res.Accepted))
	g.rejected.Add(int64(res.Rejected))
	g.limited.Add(int64(res.RateLimited))

	status := http.StatusAccepted
	if res.Accepted == 0 && res.Rejected > 0 {
		status = http.StatusBadRequest
	} else if res.Accepted == 0 && res.RateLimited > 0 {
		status = http.StatusTooManyRequests
	}
	w.Header().Set("content-type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(res)
}

// prometheus text format, so grafana can graph it without any adapter
func (g *Gateway) handleMetrics(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("content-type", "text/plain; version=0.0.4")
	fmt.Fprintf(w, "gateway_events_accepted_total %d\n", g.accepted.Load())
	fmt.Fprintf(w, "gateway_events_rejected_total %d\n", g.rejected.Load())
	fmt.Fprintf(w, "gateway_events_rate_limited_total %d\n", g.limited.Load())
	fmt.Fprintf(w, "gateway_flush_errors_total %d\n", g.flushErrors.Load())
	fmt.Fprintf(w, "gateway_queue_depth %d\n", len(g.in))
	fmt.Fprintf(w, "gateway_alert_subscribers %d\n", g.alerts.Subscribers())
}

func (g *Gateway) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ingest", g.handleIngest)
	mux.HandleFunc("/metrics", g.handleMetrics)
	mux.HandleFunc("/alerts", g.alerts.ServeSSE)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	return mux
}
