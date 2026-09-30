"""Anomaly detection on battle telemetry (NDJSON from the go gateway).

2 detectors, both stdlib only:
- damage outliers per device: robust z-score (median + MAD) over a rolling window.
  median/MAD instead of mean/stddev bcs 1 huge value would drag the mean + hide itself
- bursts: a device sending way more events per second than the rest of the fleet

usage: go run ./cmd/gateway | python -m anomaly.detect
"""

from __future__ import annotations

import json
import statistics
import sys
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Iterable, Iterator


@dataclass(frozen=True)
class Anomaly:
    device_id: str
    kind: str  # "damage_outlier" | "burst"
    detail: str
    score: float


class DamageOutliers:
    """Rolling robust z-score per device. needs `min_samples` before it judges anything."""

    def __init__(self, window: int = 50, threshold: float = 5.0, min_samples: int = 10) -> None:
        self.threshold = threshold
        self.min_samples = min_samples
        self.history: dict[str, deque[float]] = defaultdict(lambda: deque(maxlen=window))

    def feed(self, device_id: str, damage: float) -> Anomaly | None:
        past = self.history[device_id]
        verdict = None
        if len(past) >= self.min_samples:
            med = statistics.median(past)
            mad = statistics.median(abs(x - med) for x in past)
            # 1.4826 turns MAD into a stddev estimate for normal data.
            # a flat series has MAD = 0, so floor it at 10% of the median: 200 -> 210 isn't an anomaly
            spread = max(1.4826 * mad, 0.1 * abs(med), 1.0)
            z = (damage - med) / spread
            if abs(z) >= self.threshold:
                verdict = Anomaly(device_id, "damage_outlier", f"damage {damage:g} vs median {med:g}", round(z, 2))
        past.append(damage)
        return verdict


class Bursts:
    """Counts events per device per second. flags a device doing > `factor` x the fleet median."""

    def __init__(self, factor: float = 10.0, min_events: int = 20) -> None:
        self.factor = factor
        self.min_events = min_events

    def check(self, counts: dict[str, int]) -> list[Anomaly]:
        if len(counts) < 3:
            return []
        med = statistics.median(counts.values())
        return [
            Anomaly(device, "burst", f"{n} events/s vs fleet median {med:g}", round(n / max(med, 1), 2))
            for device, n in counts.items()
            if n >= self.min_events and n > self.factor * max(med, 1)
        ]


def detect(lines: Iterable[str]) -> Iterator[Anomaly]:
    outliers = DamageOutliers()
    bursts = Bursts()
    per_second: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue  # the gateway already validates, but never trust a pipe
        device = str(e.get("deviceId", ""))
        second = str(e.get("at", ""))[:19]  # 2026-09-30T22:14:05
        per_second[second][device] += 1
        if e.get("kind") == "attack" and isinstance(e.get("damage"), (int, float)):
            hit = outliers.feed(device, float(e["damage"]))
            if hit:
                yield hit

    for counts in per_second.values():
        yield from bursts.check(dict(counts))


def main() -> None:
    for a in detect(sys.stdin):
        print(json.dumps(a.__dict__), flush=True)


if __name__ == "__main__":
    main()
