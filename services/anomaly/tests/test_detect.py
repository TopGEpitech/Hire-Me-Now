import json

from anomaly.detect import Bursts, DamageOutliers, detect


def event(device, damage, at="2026-09-30T22:00:00Z", kind="attack"):
    return json.dumps({"deviceId": device, "kind": kind, "damage": damage, "at": at})


def test_stays_quiet_on_normal_damage():
    d = DamageOutliers()
    assert all(d.feed("a", dmg) is None for dmg in [30, 32, 28, 35, 31, 29, 33, 30, 34, 31, 30, 32])


def test_flags_a_huge_hit_after_warmup():
    d = DamageOutliers()
    for dmg in [30, 32, 28, 35, 31, 29, 33, 30, 34, 31]:
        d.feed("a", dmg)
    hit = d.feed("a", 900)
    assert hit is not None and hit.kind == "damage_outlier" and hit.score > 5


def test_needs_samples_before_judging():
    d = DamageOutliers(min_samples=10)
    assert d.feed("new", 30) is None
    assert d.feed("new", 9999) is None  # only 1 sample, too early to call it weird


def test_outlier_doesnt_poison_the_baseline():
    # the mean would jump after 1 big value, the median barely moves. that's why MAD
    d = DamageOutliers()
    for dmg in [30] * 10 + [900]:
        d.feed("a", dmg)
    assert d.feed("a", 31) is None


def test_devices_are_judged_separately():
    d = DamageOutliers()
    for _ in range(10):
        d.feed("weak", 5)
        d.feed("strong", 200)
    assert d.feed("strong", 210) is None


def test_burst_detection():
    counts = {f"d{i}": 3 for i in range(10)} | {"spammer": 500}
    found = Bursts().check(counts)
    assert [a.device_id for a in found] == ["spammer"]


def test_end_to_end_on_ndjson_with_junk_lines():
    lines = [event("a", 30 + i % 3) for i in range(20)] + ["not json", "", event("a", 999)]
    found = list(detect(lines))
    assert len(found) == 1 and found[0].device_id == "a"
