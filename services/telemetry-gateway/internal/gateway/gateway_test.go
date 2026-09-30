package gateway

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTest(cfg Config) (*Gateway, *MemorySink, *httptest.Server) {
	sink := &MemorySink{}
	g := New(cfg, sink)
	return g, sink, httptest.NewServer(g.Handler())
}

func post(t *testing.T, url, body string) (int, ingestResult) {
	t.Helper()
	res, err := http.Post(url+"/ingest", "application/x-ndjson", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var r ingestResult
	_ = json.NewDecoder(res.Body).Decode(&r)
	return res.StatusCode, r
}

func TestAcceptsGoodLinesAndReportsBadOnes(t *testing.T) {
	g, sink, srv := newTest(DefaultConfig())
	defer srv.Close()

	body := `{"deviceId":"d1","kind":"attack","pokemon":"pikachu","damage":30,"multiplier":2}
not json
{"deviceId":"d1","kind":"dance"}
{"deviceId":"d1","kind":"faint","pokemon":"pikachu"}`
	status, r := post(t, srv.URL, body)
	g.Close()

	if status != http.StatusAccepted || r.Accepted != 2 || r.Rejected != 2 {
		t.Fatalf("got %d %+v", status, r)
	}
	if sink.Count() != 2 {
		t.Fatalf("sink got %d events", sink.Count())
	}
}

func TestRateLimitsANoisyDeviceOnly(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Burst, cfg.PerDeviceRate = 3, 0.0001
	g, _, srv := newTest(cfg)
	defer srv.Close()
	defer g.Close()

	line := `{"deviceId":"noisy","kind":"attack","damage":1,"multiplier":1}` + "\n"
	_, r := post(t, srv.URL, strings.Repeat(line, 10))
	if r.Accepted != 3 || r.RateLimited != 7 {
		t.Fatalf("noisy: %+v", r)
	}
	_, r = post(t, srv.URL, `{"deviceId":"quiet","kind":"win"}`)
	if r.Accepted != 1 {
		t.Fatalf("quiet device got punished: %+v", r)
	}
}

func TestBatchesBySizeAndByTime(t *testing.T) {
	cfg := DefaultConfig()
	cfg.BatchSize, cfg.FlushEvery = 10, 50*time.Millisecond
	g, sink, srv := newTest(cfg)
	defer srv.Close()

	line := `{"deviceId":"d","kind":"win"}` + "\n"
	post(t, srv.URL, strings.Repeat(line, 25))
	time.Sleep(150 * time.Millisecond) // the last 5 go out on the timer
	if sink.Count() != 25 || sink.Batches < 3 {
		t.Fatalf("count=%d batches=%d", sink.Count(), sink.Batches)
	}
	g.Close()
}

func TestPushesAlertsToSubscribers(t *testing.T) {
	g, _, srv := newTest(DefaultConfig())
	defer srv.Close()
	defer g.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, srv.URL+"/alerts", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	rd := bufio.NewReader(res.Body)
	_, _ = rd.ReadString('\n') // ": connected"

	post(t, srv.URL, `{"deviceId":"d9","kind":"attack","pokemon":"golem","damage":200,"multiplier":4}`)

	for {
		line, err := rd.ReadString('\n')
		if err != nil {
			t.Fatal("no alert received:", err)
		}
		if strings.HasPrefix(line, "data: ") {
			if !strings.Contains(line, "golem landed a 4x hit") {
				t.Fatalf("wrong alert: %s", line)
			}
			return
		}
	}
}

func TestMetricsAreScrapable(t *testing.T) {
	g, _, srv := newTest(DefaultConfig())
	defer srv.Close()
	defer g.Close()
	post(t, srv.URL, `{"deviceId":"d","kind":"win"}`)
	res, err := http.Get(srv.URL + "/metrics")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var b strings.Builder
	sc := bufio.NewScanner(res.Body)
	for sc.Scan() {
		b.WriteString(sc.Text() + "\n")
	}
	if !strings.Contains(b.String(), "gateway_events_accepted_total 1") {
		t.Fatalf("metrics:\n%s", b.String())
	}
}

// the big one: 10 000 simulated devices hitting the gateway at once, nothing lost
func TestTenThousandDevices(t *testing.T) {
	if testing.Short() {
		t.Skip("slow")
	}
	cfg := DefaultConfig()
	cfg.FlushEvery = 20 * time.Millisecond
	g, sink, srv := newTest(cfg)
	defer srv.Close()

	client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{MaxIdleConnsPerHost: 128}}
	r := Simulate(context.Background(), srv.URL+"/ingest", 10_000, 2, 5, 128, client)
	g.Close()

	if r.Failed != 0 || r.Accepted != 100_000 {
		t.Fatalf("%+v", r)
	}
	if sink.Count() != 100_000 {
		t.Fatalf("sink got %d / 100000", sink.Count())
	}
	t.Logf("10k devices, 100k events in %s", r.Took)
}
