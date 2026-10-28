"use strict";

const API = Object.freeze({
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  forecast: "https://api.open-meteo.com/v1/forecast",
});
const STORAGE_KEY = "jeewan-cloudline-last-city-v1";
const DEFAULT_CITY = "Kathmandu";
const weatherCodes = {
  0: { label: "Clear sky", icon: "sun" },
  1: { label: "Mainly clear", icon: "partly" },
  2: { label: "Partly cloudy", icon: "partly" },
  3: { label: "Overcast", icon: "cloud" },
  45: { label: "Fog", icon: "fog" },
  48: { label: "Rime fog", icon: "fog" },
  51: { label: "Light drizzle", icon: "rain" },
  53: { label: "Drizzle", icon: "rain" },
  55: { label: "Heavy drizzle", icon: "rain" },
  56: { label: "Freezing drizzle", icon: "rain" },
  57: { label: "Freezing drizzle", icon: "rain" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "rain" },
  67: { label: "Freezing rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Rain showers", icon: "rain" },
  81: { label: "Rain showers", icon: "rain" },
  82: { label: "Heavy showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Heavy snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm with hail", icon: "storm" },
  99: { label: "Thunderstorm with hail", icon: "storm" },
};

const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const searchButton = document.querySelector("#search-button");
const statusMessage = document.querySelector("#status-message");
const currentPanel = document.querySelector("#current-panel");
const forecastSection = document.querySelector("#forecast-section");
const forecastList = document.querySelector("#forecast-list");
const welcomePanel = document.querySelector("#welcome-panel");

function weatherInfo(code) {
  return weatherCodes[code] || { label: "Conditions unavailable", icon: "cloud" };
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function createWeatherIcon(kind) {
  const svg = createSvgElement("svg", { viewBox: "0 0 64 64", class: "weather-icon", focusable: "false", "aria-hidden": "true" });
  const add = (name, attrs) => svg.append(createSvgElement(name, attrs));
  const cloud = () => add("path", { class: "cloud-shape", d: "M18 43h31a11 11 0 0 0 1-22 17 17 0 0 0-32-3 12 12 0 0 0 0 25z" });
  const sun = (cx = 30, cy = 28, radius = 10) => {
    add("circle", { class: "sun-disc", cx, cy, r: radius });
    const rays = [];
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = angle * Math.PI / 180;
      const x1 = cx + Math.cos(rad) * (radius + 5);
      const y1 = cy + Math.sin(rad) * (radius + 5);
      const x2 = cx + Math.cos(rad) * (radius + 9);
      const y2 = cy + Math.sin(rad) * (radius + 9);
      rays.push(`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
    add("path", { class: "sun-rays", d: rays.join("") });
  };

  if (kind === "sun") sun(32, 32, 12);
  else if (kind === "partly") { sun(25, 23, 10); cloud(); }
  else {
    cloud();
    if (kind === "rain") add("path", { class: "rain-line", d: "M23 49l-3 6m14-6-3 6m14-6-3 6" });
    if (kind === "snow") add("path", { class: "snow-line", d: "M23 49v7m-3.5-3.5h7M36 49v7m-3.5-3.5h7M49 49v7m-3.5-3.5h7" });
    if (kind === "fog") add("path", { class: "fog-line", d: "M15 50h34M20 56h28" });
    if (kind === "storm") add("path", { class: "lightning", d: "M35 44l-8 11h7l-3 9 12-14h-7l4-6z" });
  }
  return svg;
}

async function fetchJson(url, serviceName) {
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error("A network problem stopped the weather request. Check your connection and try again.");
  }
  if (!response.ok) throw new Error(`${serviceName} is unavailable right now. Please try again in a moment.`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error("The weather service sent an unreadable response. Please try again.");
  }
}

async function findCity(name) {
  const url = new URL(API.geocoding);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const data = await fetchJson(url, "City search");
  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw new Error(`We couldn't find “${name}”. Check the spelling or try adding the country.`);
  }
  const result = data.results[0];
  return { name: result.name, country: result.country || "", admin1: result.admin1 || "", latitude: result.latitude, longitude: result.longitude };
}

async function getWeather(latitude, longitude) {
  const url = new URL(API.forecast);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  const data = await fetchJson(url, "The forecast service");
  if (!data.current || !data.daily || !Array.isArray(data.daily.time)) {
    throw new Error("The forecast is incomplete. Please search again in a moment.");
  }
  return data;
}

function setStatus(message, state = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message${state ? ` is-${state}` : ""}`;
}

function rounded(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "—";
}

function renderForecast(daily) {
  const fragment = document.createDocumentFragment();
  const days = Math.min(5, daily.time.length);
  for (let index = 0; index < days; index += 1) {
    const item = document.createElement("li");
    item.className = "forecast-day";

    const date = document.createElement("p");
    date.className = "forecast-date";
    date.textContent = new Date(`${daily.time[index]}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    const info = weatherInfo(daily.weather_code[index]);
    icon.append(createWeatherIcon(info.icon));

    const condition = document.createElement("p");
    condition.className = "forecast-condition";
    condition.textContent = info.label;

    const temperatures = document.createElement("p");
    temperatures.className = "forecast-temperatures";
    const high = document.createElement("span");
    high.className = "forecast-high";
    high.textContent = `${rounded(daily.temperature_2m_max[index])}°`;
    const low = document.createElement("span");
    low.className = "forecast-low";
    low.textContent = `${rounded(daily.temperature_2m_min[index])}°`;
    temperatures.append(high, low);

    item.append(date, icon, condition, temperatures);
    fragment.append(item);
  }
  forecastList.replaceChildren(fragment);
}

function renderWeather(city, data) {
  const current = data.current;
  const info = weatherInfo(current.weather_code);
  const location = [city.name, city.admin1 && city.admin1 !== city.name ? city.admin1 : "", city.country].filter(Boolean).join(", ");
  document.querySelector("#place-name").textContent = location;
  const dateOptions = { weekday: "long", month: "long", day: "numeric" };
  if (data.timezone) dateOptions.timeZone = data.timezone;
  document.querySelector("#current-date").textContent = new Date().toLocaleDateString(undefined, dateOptions);
  document.querySelector("#current-condition").textContent = info.label;
  document.querySelector("#current-temperature").textContent = rounded(current.temperature_2m);
  document.querySelector("#feels-like").textContent = rounded(current.apparent_temperature);
  document.querySelector("#humidity-value").textContent = `${rounded(current.relative_humidity_2m)}%`;
  document.querySelector("#wind-value").textContent = rounded(current.wind_speed_10m);
  document.querySelector("#precipitation-value").textContent = rounded(current.precipitation);
  document.querySelector("#current-icon").replaceChildren(createWeatherIcon(info.icon));
  renderForecast(data.daily);
  currentPanel.hidden = false;
  forecastSection.hidden = false;
  welcomePanel.hidden = true;
}

function loadSavedCity() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function saveCity(name) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (error) {
    // The dashboard still works if browser storage is unavailable.
  }
}

async function searchWeather(rawName) {
  const name = rawName.trim();
  if (!name) {
    setStatus("Type a city name to see its weather.", "error");
    cityInput.focus();
    return;
  }
  if (name.length < 2) {
    setStatus("Enter at least two characters for a city search.", "error");
    cityInput.focus();
    return;
  }

  searchButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  currentPanel.hidden = true;
  forecastSection.hidden = true;
  welcomePanel.hidden = true;
  setStatus(`Looking up ${name} and fetching the forecast…`);

  try {
    const city = await findCity(name);
    const weather = await getWeather(city.latitude, city.longitude);
    renderWeather(city, weather);
    cityInput.value = city.name;
    saveCity(city.name);
    setStatus(`Showing current conditions and a five-day forecast for ${city.name}.`, "success");
  } catch (error) {
    welcomePanel.hidden = false;
    setStatus(error instanceof Error ? error.message : "Something went wrong. Please try again.", "error");
  } finally {
    searchButton.disabled = false;
    form.removeAttribute("aria-busy");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWeather(cityInput.value);
});

const savedCity = loadSavedCity();
if (savedCity) cityInput.value = savedCity;
searchWeather(savedCity || DEFAULT_CITY);


