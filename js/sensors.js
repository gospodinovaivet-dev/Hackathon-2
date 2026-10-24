// Fridge sensors: temperature and door (magnet sensor). Read-only in the app.
// Rules: the fridge closes the door itself after 60 s; a problem that lasts 10 minutes sends an alert.
// The door state only ever comes from the sensor, never from a photo.
const SENSOR_RULES = { tempMin: 0, tempMax: 5, autoCloseSec: 60, alertAfterMin: 10 };

const Sensors = (() => {
  const s = { temp: 3.8, doorOpen: false, doorSecs: 0, tempSecs: 0, live: false };
  const active = {}; // alerts on screen right now, by kind

  const tempState = () => s.temp > SENSOR_RULES.tempMax ? "warm" : s.temp < SENSOR_RULES.tempMin ? "cold" : "ok";
  const duration = secs => secs < 60 ? `${secs} s` : plural(Math.floor(secs / 60), "minute");
  const limitSecs = () => SENSOR_RULES.alertAfterMin * 60;

  function setAlert(kind, on, text) {
    if (on && !active[kind]) toast("Alert sent to your phone");
    if (on) active[kind] = text; else delete active[kind];
  }

  // Each reading from the fridge (ESP32) goes through here
  function update(reading) {
    s.live = true;
    if (typeof reading.temp === "number") s.temp = reading.temp;
    if (typeof reading.doorOpen === "boolean" && reading.doorOpen !== s.doorOpen) {
      s.doorOpen = reading.doorOpen;
      s.doorSecs = 0;
    }
  }

  function tick() {
    // Until the hardware is connected: a steady, healthy simulated reading
    if (!s.live) s.temp = 3.8 + Math.sin(Date.now() / 90000) * 0.3;

    if (s.doorOpen) s.doorSecs += 1;
    s.tempSecs = tempState() === "ok" ? 0 : s.tempSecs + 1;

    setAlert("door", s.doorOpen && s.doorSecs >= limitSecs(),
      `Your fridge door has been open for ${duration(s.doorSecs)}. Something is stopping it from closing.`);
    setAlert("temp", tempState() !== "ok" && s.tempSecs >= limitSecs(),
      tempState() === "warm"
        ? `Your fridge is at ${s.temp.toFixed(1)} °C. Food will spoil faster.`
        : `Your fridge is at ${s.temp.toFixed(1)} °C. Food may freeze.`);
    render();
  }

  function render() {
    const t = tempState();
    $("sensor-temp").textContent = `${s.temp.toFixed(1)} °C`;
    $("sensor-temp-box").className = "reading " + (t === "ok" ? "safe" : s.tempSecs >= limitSecs() ? "expired" : "soon");
    $("sensor-temp-text").textContent = t === "ok"
      ? `Safe range ${SENSOR_RULES.tempMin}–${SENSOR_RULES.tempMax} °C`
      : `Too ${t} for ${duration(s.tempSecs)}. Alert after ${SENSOR_RULES.alertAfterMin} min.`;

    $("sensor-door").textContent = s.doorOpen ? "Open" : "Closed";
    $("sensor-door-box").className = "reading " + (!s.doorOpen ? "safe" : s.doorSecs >= limitSecs() ? "expired" : "soon");
    $("sensor-door-text").textContent = !s.doorOpen
      ? "Magnet sensor: door shut"
      : s.doorSecs >= SENSOR_RULES.autoCloseSec
        ? `Open for ${duration(s.doorSecs)}. Buzzer on: something is blocking it.`
        : `Open for ${duration(s.doorSecs)}. Closes itself at ${SENSOR_RULES.autoCloseSec} s.`;

    $("alerts").replaceChildren(...Object.entries(active).map(([kind, text]) =>
      el("div", { class: "alert-item", role: "alert" }, el("span", { class: "dot" }), el("span", {}, text))));
  }

  function init() {
    render();
    setInterval(tick, 1000);
  }

  return { init, update };
})();
