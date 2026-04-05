import type {
  StatsResponse,
  EndpointsResponse,
  CustomersResponse,
  TimeseriesResponse,
  PersonasResponse,
  TimeRange,
} from "@/types/pulse";

const BASE = "/api/pulse";

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getStats(range: TimeRange) {
  return fetchJSON<StatsResponse>(`${BASE}/stats?range=${range}`);
}

export function getEndpoints() {
  return fetchJSON<EndpointsResponse>(`${BASE}/endpoints`);
}

export function getCustomers(limit = 20) {
  return fetchJSON<CustomersResponse>(`${BASE}/customers?limit=${limit}`);
}

export function getTimeseries(range: TimeRange) {
  return fetchJSON<TimeseriesResponse>(`${BASE}/timeseries?range=${range}`);
}

export function getPersonas(limit = 200) {
  return fetchJSON<PersonasResponse>(`${BASE}/personas?limit=${limit}`);
}
