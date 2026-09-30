package gateway

import (
	"context"
	"encoding/json"
	"io"
	"sync"
)

// Sink = where accepted batches go. in prod that's a Kafka producer (topic battle-events,
// key = deviceId so 1 device keeps its order). it's an interface so the gateway doesn't care.
type Sink interface {
	Publish(ctx context.Context, batch []Event) error
}

// NDJSONSink writes 1 json line per event. good for local dev + piping into the python anomaly service
type NDJSONSink struct {
	mu sync.Mutex
	w  io.Writer
}

func NewNDJSONSink(w io.Writer) *NDJSONSink { return &NDJSONSink{w: w} }

func (s *NDJSONSink) Publish(_ context.Context, batch []Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	enc := json.NewEncoder(s.w)
	for _, e := range batch {
		if err := enc.Encode(e); err != nil {
			return err
		}
	}
	return nil
}

// MemorySink keeps everything, for tests
type MemorySink struct {
	mu      sync.Mutex
	Events  []Event
	Batches int
}

func (s *MemorySink) Publish(_ context.Context, batch []Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Events = append(s.Events, batch...)
	s.Batches++
	return nil
}

func (s *MemorySink) Count() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.Events)
}
