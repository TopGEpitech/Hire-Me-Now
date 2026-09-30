package gateway

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

type Alert struct {
	DeviceID string `json:"deviceId"`
	Message  string `json:"message"`
}

// Hub pushes alerts to every connected browser over server-sent events.
// slow clients get dropped alerts, never block ingestion
type Hub struct {
	mu   sync.Mutex
	subs map[chan Alert]struct{}
}

func NewHub() *Hub { return &Hub{subs: map[chan Alert]struct{}{}} }

func (h *Hub) Subscribe() (chan Alert, func()) {
	ch := make(chan Alert, 16)
	h.mu.Lock()
	h.subs[ch] = struct{}{}
	h.mu.Unlock()
	return ch, func() {
		h.mu.Lock()
		delete(h.subs, ch)
		h.mu.Unlock()
	}
}

func (h *Hub) Subscribers() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.subs)
}

func (h *Hub) Broadcast(a Alert) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.subs {
		select {
		case ch <- a:
		default: // full buffer = slow client, skip it
		}
	}
}

func (h *Hub) ServeSSE(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("content-type", "text/event-stream")
	w.Header().Set("cache-control", "no-store")
	w.Header().Set("access-control-allow-origin", "*")
	ch, unsubscribe := h.Subscribe()
	defer unsubscribe()
	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()
	for {
		select {
		case <-r.Context().Done():
			return
		case a := <-ch:
			b, _ := json.Marshal(a)
			fmt.Fprintf(w, "event: alert\ndata: %s\n\n", b)
			flusher.Flush()
		}
	}
}
