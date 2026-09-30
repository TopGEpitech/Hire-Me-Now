package gateway

import (
	"errors"
	"time"
)

// Event = 1 thing that happened in a battle, sent by a "device" (a browser, a bot, the simulator).
type Event struct {
	DeviceID   string    `json:"deviceId"`
	Kind       string    `json:"kind"` // attack | faint | win
	Pokemon    string    `json:"pokemon"`
	Damage     int       `json:"damage"`
	Multiplier float64   `json:"multiplier"`
	At         time.Time `json:"at"`
}

var validKinds = map[string]bool{"attack": true, "faint": true, "win": true}

func (e Event) Validate() error {
	switch {
	case e.DeviceID == "" || len(e.DeviceID) > 64:
		return errors.New("deviceId required, 64 chars max")
	case !validKinds[e.Kind]:
		return errors.New("kind must be attack, faint or win")
	case e.Damage < 0 || e.Damage > 10_000:
		return errors.New("damage out of range")
	case e.Multiplier < 0 || e.Multiplier > 4:
		return errors.New("multiplier out of range")
	}
	return nil
}
