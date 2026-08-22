import { geocodeAddress, geocodeMany } from './geocode';
import { asEpoch, asNumber, asString, fetchJson, inBbox, jitterFromId } from './http';
import { getCityLiveVideoCams } from './louisville-live-cams';
import type { CityConfig, CityEvent, CityFeedResponse, EventSeverity, FeedHealth, FeedStatus } from './types';

const NASHVILLE_FS = 'https://services2.arcgis.com/HdTo6HJqh92wn4D8/ArcGIS/rest/services';
const LOUISVILLE_FS = 'https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services';
const KY_CAMERAS =
  'https://kygisserver.ky.gov/arcgis/rest/services/WGS84WM_Services/Ky_WebCams_WGS84WM/MapServer/0/query';
const SMARTWAY_EVENTS =
  'https://spatial.tdot.tn.gov/arcgis/rest/services/Smartway/Smartway_Events/FeatureServer/0/query';

interface ArcGisFeature {
  attributes?: Record<string, unknown>;
  geometry?: {
    x?: number;
    y?: number;
    paths?: number[][][];
    rings?: number[][][];
  };
}

interface ArcGisQuery {
  features?: ArcGisFeature[];
}

interface FeedPack {
  events: CityEvent[];
  health: FeedHealth;
  weather?: CityFeedResponse['weather'];
}

function feed(id: string, label: string, status: FeedStatus, count: number, detail?: string): FeedHealth {
  return { id, label, status, count, detail };
}

function settled(result: PromiseSettledResult<FeedPack>, fallback: FeedPack): FeedPack {
  return result.status === 'fulfilled' ? result.value : fallback;
}

function centroidFromGeometry(geometry?: ArcGisFeature['geometry']): { lng: number; lat: number } | null {
  if (!geometry) return null;
  if (typeof geometry.x === 'number' && typeof geometry.y === 'number') {
    return { lng: geometry.x, lat: geometry.y };
  }
  const path = geometry.paths?.[0] ?? geometry.rings?.[0];
  if (!path?.length) return null;
  const mid = path[Math.floor(path.length / 2)];
  if (!mid || mid.length < 2) return null;
  return { lng: mid[0], lat: mid[1] };
}

async function queryArcGis(url: string, params: Record<string, string>): Promise<ArcGisFeature[]> {
  const search = new URLSearchParams({
    f: 'json',
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: '80',
    ...params,
  });
  const data = await fetchJson<ArcGisQuery>(`${url}?${search.toString()}`, { timeoutMs: 10000 });
  return data.features ?? [];
}

function eventFrom(
  partial: Omit<CityEvent, 'severity'> & { severity?: EventSeverity },
): CityEvent {
  return {
    severity: 'info',
    ...partial,
  };
}

async function fetchWeather(city: CityConfig): Promise<{
  events: CityEvent[];
  weather?: CityFeedResponse['weather'];
  health: FeedHealth;
}> {
  try {
    const points = await fetchJson<{
      properties?: {
        forecast?: string;
        observationStations?: string;
        relativeLocation?: { properties?: { city?: string } };
      };
    }>(`https://api.weather.gov/points/${city.latitude},${city.longitude}`);

    const [alerts, stations] = await Promise.all([
      fetchJson<{ features?: Array<{ id?: string; properties?: Record<string, unknown> }> }>(
        `https://api.weather.gov/alerts/active?point=${city.latitude},${city.longitude}`,
      ),
      points.properties?.observationStations
        ? fetchJson<{ features?: Array<{ id?: string; properties?: { stationIdentifier?: string; name?: string } }> }>(
            points.properties.observationStations,
          )
        : Promise.resolve({ features: [] }),
    ]);

    const events: CityEvent[] = (alerts.features ?? []).map((feature) => {
      const props = feature.properties ?? {};
      const severityText = asString(props.severity)?.toLowerCase();
      const severity: EventSeverity =
        severityText === 'extreme' || severityText === 'severe' ? 'alert' : 'watch';
      return eventFrom({
        id: `wx-${feature.id ?? asString(props.id) ?? Math.random()}`,
        category: 'weather',
        severity,
        title: asString(props.event) ?? 'Weather alert',
        description: asString(props.headline) ?? asString(props.description)?.slice(0, 280) ?? 'National Weather Service alert',
        timestamp: asEpoch(props.sent) ?? asEpoch(props.effective),
        source: 'NWS',
        latitude: city.latitude + jitterFromId(String(feature.id), 0.03).lat,
        longitude: city.longitude + jitterFromId(String(feature.id), 0.03).lng,
      });
    });

    const stationUrl = stations.features?.[0]?.id;
    let weather: CityFeedResponse['weather'] | undefined;
    if (stationUrl) {
      const obs = await fetchJson<{
        properties?: {
          station?: string;
          timestamp?: string;
          textDescription?: string;
          temperature?: { value?: number | null };
          windSpeed?: { value?: number | null };
          relativeHumidity?: { value?: number | null };
        };
      }>(`${stationUrl}/observations/latest`);
      const tempC = obs.properties?.temperature?.value;
      const windMs = obs.properties?.windSpeed?.value;
      weather = {
        station: stations.features?.[0]?.properties?.stationIdentifier ?? 'NWS',
        temperatureF: tempC == null ? undefined : Math.round((tempC * 9) / 5 + 32),
        windMph: windMs == null ? undefined : Math.round(windMs * 2.237),
        humidity: obs.properties?.relativeHumidity?.value == null
          ? undefined
          : Math.round(obs.properties.relativeHumidity.value),
        text: obs.properties?.textDescription,
      };
      events.unshift(
        eventFrom({
          id: `wx-obs-${city.id}`,
          category: 'weather',
          title: weather.text ? weather.text : 'Current conditions',
          description: [
            weather.temperatureF != null ? `${weather.temperatureF}°F` : null,
            weather.windMph != null ? `Wind ${weather.windMph} mph` : null,
            weather.humidity != null ? `Humidity ${weather.humidity}%` : null,
            weather.station,
          ]
            .filter(Boolean)
            .join(' · '),
          timestamp: asEpoch(obs.properties?.timestamp),
          source: 'NWS',
          latitude: city.latitude,
          longitude: city.longitude,
        }),
      );
    }

    return {
      events,
      weather,
      health: feed('weather', 'National Weather Service', 'online', events.length),
    };
  } catch (error) {
    return {
      events: [],
      health: feed('weather', 'National Weather Service', 'offline', 0, String(error)),
    };
  }
}

async function fetchKyCameras(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  if (city.state !== 'KY') {
    return { events: [], health: feed('cameras', 'Traffic cameras', 'unavailable', 0, 'Kentucky cameras only') };
  }
  try {
    const features = await queryArcGis(KY_CAMERAS, {
      where: city.id === 'louisville' ? "county='Jefferson'" : '1=1',
      outFields: 'OBJECTID,id,name,description,snapshot,latitude,longitude,status,highway,direction,milemarker',
      resultRecordCount: '400',
    });
    const candidates = features
      .map((feature) => {
        const attrs = feature.attributes ?? {};
        const lat = asNumber(attrs.latitude);
        const lng = asNumber(attrs.longitude);
        if (!inBbox(lng, lat, city.bbox)) return null;
        const snapshot = asString(attrs.snapshot);
        if (!snapshot) return null;
        const rawStatus = asString(attrs.status)?.toLowerCase();
        const cameraStatus = rawStatus === 'online' || rawStatus === 'offline' ? rawStatus : 'unknown';
        const title = asString(attrs.description) ?? asString(attrs.highway) ?? 'Traffic camera';
        return eventFrom({
          id: `cam-${city.id}-${asString(attrs.id) ?? asString(attrs.OBJECTID) ?? `${lat}-${lng}`}`,
          category: 'camera',
          severity: cameraStatus === 'offline' ? 'alert' : 'info',
          title,
          description: [
            asString(attrs.highway),
            asString(attrs.direction),
            asNumber(attrs.milemarker) != null ? `MM ${asNumber(attrs.milemarker)}` : null,
            cameraStatus,
          ].filter(Boolean).join(' · ') || 'KYTC / TRIMARC camera',
          latitude: lat,
          longitude: lng,
          timestamp: null,
          source: 'KYTC cameras',
          mediaUrl: snapshot,
          cameraStatus,
        });
      })
      .filter((item): item is CityEvent => item != null);
    const stills = candidates;
    const liveVideo = await getCityLiveVideoCams(city);
    const events = [...liveVideo, ...stills];
    const online = stills.filter((camera) => camera.cameraStatus === 'online').length;
    const offline = stills.filter((camera) => camera.cameraStatus === 'offline').length;
    const unknown = stills.length - online - offline;
    return {
      events,
      health: feed(
        'cameras',
        city.id === 'louisville' ? 'Louisville cameras' : 'Bowling Green cameras',
        events.length ? 'online' : 'empty',
        events.length,
        `${liveVideo.length} live video · ${online} online · ${offline} offline · ${unknown} unknown`,
      ),
    };
  } catch (error) {
    const liveVideo = await getCityLiveVideoCams(city).catch(() => []);
    return {
      events: liveVideo,
      health: feed(
        'cameras',
        'KYTC / TRIMARC cameras',
        liveVideo.length ? 'online' : 'offline',
        liveVideo.length,
        liveVideo.length ? `${liveVideo.length} live video · stills offline` : String(error),
      ),
    };
  }
}

interface TnCameraRecord {
  id?: number | string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  httpsVideoUrl?: string;
  jurisdiction?: string;
  route?: string;
  lat?: number;
  lng?: number;
  active?: string | boolean;
}

let tnCameraCache: { at: number; cameras: TnCameraRecord[] } | null = null;

async function loadTnCameras(): Promise<TnCameraRecord[]> {
  if (tnCameraCache && Date.now() - tnCameraCache.at < 60 * 60 * 1000) {
    return tnCameraCache.cameras;
  }
  const cameras = await fetchJson<TnCameraRecord[]>(
    'https://raw.githubusercontent.com/stephenyeargin/trmnl-tdot-smartway/main/assets/cameras.json',
    { timeoutMs: 15000 },
  );
  tnCameraCache = { at: Date.now(), cameras: Array.isArray(cameras) ? cameras : [] };
  return tnCameraCache.cameras;
}

async function fetchTnCameras(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  if (city.state !== 'TN') {
    return { events: [], health: feed('cameras', 'Traffic cameras', 'unavailable', 0, 'Tennessee cameras only') };
  }
  try {
    const cameras = await loadTnCameras();
    const events = cameras
      .filter((camera) => camera.active !== false && camera.active !== 'false')
      .map((camera) => {
        const lat = asNumber(camera.lat);
        const lng = asNumber(camera.lng);
        if (!inBbox(lng, lat, city.bbox) || !camera.thumbnailUrl) return null;
        return eventFrom({
          id: `tn-cam-${camera.id ?? camera.thumbnailUrl}`,
          category: 'camera',
          title: camera.title ?? camera.description ?? 'SmartWay camera',
          description: [camera.route, camera.jurisdiction].filter(Boolean).join(' · ') || 'TDOT SmartWay',
          latitude: lat,
          longitude: lng,
          timestamp: null,
          source: 'TDOT SmartWay cameras',
          mediaUrl: camera.thumbnailUrl,
          streamUrl: camera.httpsVideoUrl,
        });
      })
      .filter((item): item is CityEvent => item != null)
      .slice(0, 90);
    const liveVideo = await getCityLiveVideoCams(city);
    const merged = [...liveVideo, ...events];
    return {
      events: merged,
      health: feed(
        'cameras',
        'Nashville cameras',
        merged.length ? 'online' : 'empty',
        merged.length,
        `${liveVideo.length} live video · ${events.length} SmartWay`,
      ),
    };
  } catch (error) {
    const liveVideo = await getCityLiveVideoCams(city).catch(() => []);
    return {
      events: liveVideo,
      health: feed(
        'cameras',
        'TDOT SmartWay cameras',
        liveVideo.length ? 'online' : 'offline',
        liveVideo.length,
        liveVideo.length ? `${liveVideo.length} live video · SmartWay offline` : String(error),
      ),
    };
  }
}

async function fetchAircraft(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const data = await fetchJson<{ states?: Array<Array<string | number | null>> }>(
      `https://opensky-network.org/api/states/all?lamin=${city.bbox.south}&lomin=${city.bbox.west}&lamax=${city.bbox.north}&lomax=${city.bbox.east}`,
      { timeoutMs: 12000 },
    );
    const events = (data.states ?? [])
      .map((state) => {
        const icao = asString(state[0]);
        const callsign = asString(state[1])?.trim();
        const lng = asNumber(state[5]);
        const lat = asNumber(state[6]);
        const alt = asNumber(state[7]);
        const onGround = Boolean(state[8]);
        const velocity = asNumber(state[9]);
        if (!inBbox(lng, lat, city.bbox) || onGround) return null;
        return eventFrom({
          id: `air-${icao ?? callsign ?? `${lng},${lat}`}`,
          category: 'aircraft',
          title: callsign ? `AIR ${callsign}` : `Aircraft ${icao ?? 'unknown'}`,
          description: [
            asString(state[2]),
            alt != null ? `${Math.round(alt * 3.281)} ft` : null,
            velocity != null ? `${Math.round(velocity * 1.944)} kt` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          latitude: lat,
          longitude: lng,
          timestamp: asEpoch(state[4]),
          source: 'OpenSky',
        });
      })
      .filter((item): item is CityEvent => item != null)
      .slice(0, 40);
    return {
      events,
      health: feed('aircraft', 'OpenSky aircraft', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('aircraft', 'OpenSky aircraft', 'offline', 0, String(error)) };
  }
}

async function fetchWater(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const { west, south, east, north } = city.bbox;
    const data = await fetchJson<{
      value?: {
        timeSeries?: Array<{
          name?: string;
          sourceInfo?: {
            siteName?: string;
            geoLocation?: { geogLocation?: { latitude?: number; longitude?: number } };
          };
          variable?: { variableName?: string; unit?: { unitCode?: string } };
          values?: Array<{ value?: Array<{ value?: string; dateTime?: string }> }>;
        }>;
      };
    }>(
      `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${west},${south},${east},${north}&parameterCd=00065,00060&siteStatus=active`,
    );
    const events = (data.value?.timeSeries ?? [])
      .map((series) => {
        const loc = series.sourceInfo?.geoLocation?.geogLocation;
        const sample = series.values?.[0]?.value?.[0];
        const lat = asNumber(loc?.latitude);
        const lng = asNumber(loc?.longitude);
        if (!inBbox(lng, lat, city.bbox) || !sample) return null;
        return eventFrom({
          id: `water-${series.name ?? series.sourceInfo?.siteName}`,
          category: 'water',
          title: series.sourceInfo?.siteName ?? 'USGS gauge',
          description: `${series.variable?.variableName ?? 'Stage'}: ${sample.value ?? 'n/a'} ${series.variable?.unit?.unitCode ?? ''}`.trim(),
          latitude: lat,
          longitude: lng,
          timestamp: asEpoch(sample.dateTime),
          source: 'USGS',
        });
      })
      .filter((item): item is CityEvent => item != null)
      .slice(0, 25);
    return {
      events,
      health: feed('water', 'USGS river gauges', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('water', 'USGS river gauges', 'offline', 0, String(error)) };
  }
}

async function fetchLouisville311(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const since = Date.now() - 1000 * 60 * 60 * 24 * 3;
    const queryUrl = `${LOUISVILLE_FS}/metro_311_2026/FeatureServer/0/query`;
    const features = await queryArcGis(queryUrl, {
      where: `requested_datetime >= ${since}`,
      orderByFields: 'requested_datetime DESC',
      resultRecordCount: '50',
    }).catch(() =>
      queryArcGis(queryUrl, {
        where: '1=1',
        orderByFields: 'requested_datetime DESC',
        resultRecordCount: '50',
      }),
    );
    const events = features
      .map((feature) => {
        const attrs = feature.attributes ?? {};
        const lat = asNumber(attrs.latitude);
        const lng = asNumber(attrs.longitude);
        if (!inBbox(lng, lat, city.bbox)) return null;
        const status = asString(attrs.status_description);
        return eventFrom({
          id: `311-${asString(attrs.service_request_id) ?? asString(attrs.ObjectId)}`,
          category: 'civic',
          severity: status?.toLowerCase().includes('open') ? 'watch' : 'info',
          title: asString(attrs.service_name) ?? 'Metro 311',
          description: [asString(attrs.address), status, asString(attrs.description)].filter(Boolean).join(' — '),
          latitude: lat,
          longitude: lng,
          timestamp: asEpoch(attrs.requested_datetime),
          source: 'Louisville Metro 311',
        });
      })
      .filter((item): item is CityEvent => item != null);
    return {
      events,
      health: feed('civic', 'Louisville Metro 311', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('civic', 'Louisville Metro 311', 'offline', 0, String(error)) };
  }
}

async function fetchLouisvilleCrime(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const since = Date.now() - 1000 * 60 * 60 * 24 * 2;
    const queryUrl = `${LOUISVILLE_FS}/crime_data_2026/FeatureServer/0/query`;
    const features = await queryArcGis(queryUrl, {
      where: `date_reported >= ${since}`,
      orderByFields: 'date_reported DESC',
      returnGeometry: 'false',
      resultRecordCount: '25',
    }).catch(() =>
      queryArcGis(queryUrl, {
        where: '1=1',
        orderByFields: 'date_reported DESC',
        returnGeometry: 'false',
        resultRecordCount: '25',
      }),
    );
    const addresses = features.map((feature) => {
      const attrs = feature.attributes ?? {};
      const block = asString(attrs.block_address) ?? '';
      const cityName = asString(attrs.city) ?? 'Louisville';
      return `${block.replace(/BLOCK/i, '').trim()}, ${cityName}, KY ${asString(attrs.zip_code) ?? ''}`.trim();
    });
    const coords = await geocodeMany(addresses, 10);
    const events = features.map((feature, index) => {
      const attrs = feature.attributes ?? {};
      const address = addresses[index];
      const point = coords.get(address);
      const jitter = jitterFromId(asString(attrs.incident_number) ?? String(index));
      return eventFrom({
        id: `crime-${asString(attrs.incident_number) ?? index}`,
        category: 'crime',
        severity: 'watch',
        title: asString(attrs.offense_code_name) ?? asString(attrs.offense_classification) ?? 'LMPD incident',
        description: [asString(attrs.block_address), asString(attrs.lmpd_division), asString(attrs.location_category)]
          .filter(Boolean)
          .join(' · '),
        latitude: point ? point.lat + jitter.lat : undefined,
        longitude: point ? point.lng + jitter.lng : undefined,
        timestamp: asEpoch(attrs.date_reported) ?? asEpoch(attrs.date_occurred),
        source: 'LMPD open data',
      });
    });
    return {
      events,
      health: feed('crime', 'LMPD crime reports', events.length ? 'online' : 'empty', events.length, 'Updated from Metro open data, not live CAD'),
    };
  } catch (error) {
    return { events: [], health: feed('crime', 'LMPD crime reports', 'offline', 0, String(error)) };
  }
}

async function fetchNashvillePolice(): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const features = await queryArcGis(
      `${NASHVILLE_FS}/Metro_Nashville_Police_Department_Active_Dispatch_Table_view/FeatureServer/0/query`,
      { where: '1=1', returnGeometry: 'false', resultRecordCount: '80' },
    );
    const events = await Promise.all(
      features.slice(0, 16).map(async (feature) => {
        const attrs = feature.attributes ?? {};
        const location = asString(attrs.Location);
        const cityName = asString(attrs.CityName) ?? 'Nashville';
        const address = location ? `${location}, ${cityName}, TN` : `${cityName}, TN`;
        const point = await geocodeAddress(address);
        const jitter = jitterFromId(asString(attrs.ObjectId) ?? address);
        return eventFrom({
          id: `mnpd-${asString(attrs.ObjectId) ?? address}`,
          category: 'police',
          severity: 'alert',
          title: asString(attrs.IncidentTypeName) ?? asString(attrs.IncidentTypeCode) ?? 'MNPD dispatch',
          description: [location, asString(attrs.LocationDescription), cityName].filter(Boolean).join(' · '),
          latitude: point ? point.lat + jitter.lat : undefined,
          longitude: point ? point.lng + jitter.lng : undefined,
          timestamp: asEpoch(attrs.LastUpdated) ?? asEpoch(attrs.CallReceivedTime),
          source: 'MNPD active dispatch',
        });
      }),
    );
    return {
      events,
      health: feed('police', 'MNPD active dispatch', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('police', 'MNPD active dispatch', 'offline', 0, String(error)) };
  }
}

async function fetchNashvilleFire(): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const features = await queryArcGis(
      `${NASHVILLE_FS}/Nashville_Fire_Department_Active_Incidents_view/FeatureServer/0/query`,
      { where: '1=1', returnGeometry: 'false', resultRecordCount: '80' },
    );
    const events = await Promise.all(
      features.slice(0, 25).map(async (feature, index) => {
        const attrs = feature.attributes ?? {};
        const zip = asString(attrs.PostalCode);
        const point = zip ? await geocodeAddress(`Nashville, TN ${zip}`) : null;
        const jitter = jitterFromId(asString(attrs.event_number) ?? asString(attrs.ObjectId) ?? 'fire');
        return eventFrom({
          id: `nfd-${asString(attrs.event_number) ?? 'event'}-${asString(attrs.ObjectId) ?? index}`,
          category: 'fire',
          severity: 'alert',
          title: asString(attrs.incident_type_id) ?? 'NFD incident',
          description: [zip ? `ZIP ${zip}` : null, asString(attrs.Unit_ID) ? `Units ${asString(attrs.Unit_ID)}` : null]
            .filter(Boolean)
            .join(' · '),
          latitude: point ? point.lat + jitter.lat : undefined,
          longitude: point ? point.lng + jitter.lng : undefined,
          timestamp: asEpoch(attrs.DispatchDateTime),
          source: 'NFD active incidents',
        });
      }),
    );
    return {
      events,
      health: feed('fire', 'NFD active incidents', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('fire', 'NFD active incidents', 'offline', 0, String(error)) };
  }
}

async function fetchNashville311(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const queryUrl = `${NASHVILLE_FS}/hubNashville_311_Service_Requests_Current_Year_view/FeatureServer/0/query`;
    const features = await queryArcGis(queryUrl, {
      where: '1=1',
      resultRecordCount: '40',
    });
    const events = features
      .map((feature, index) => {
        const attrs = feature.attributes ?? {};
        const point = centroidFromGeometry(feature.geometry);
        const lat = point?.lat ?? asNumber(attrs.Latitude) ?? asNumber(attrs.lat);
        const lng = point?.lng ?? asNumber(attrs.Longitude) ?? asNumber(attrs.lon);
        if (!inBbox(lng, lat, city.bbox)) return null;
        const title =
          asString(attrs.RequestType) ??
          asString(attrs.Request_Type) ??
          asString(attrs.Type) ??
          asString(attrs.Title) ??
          'hubNashville 311';
        const description =
          asString(attrs.Address) ??
          asString(attrs.IncidentAddress) ??
          asString(attrs.Status) ??
          'Open civic request';
        return eventFrom({
          id: `nash-311-${asString(attrs.RequestId) ?? asString(attrs.OBJECTID) ?? index}`,
          category: 'civic',
          title,
          description,
          latitude: lat,
          longitude: lng,
          timestamp:
            asEpoch(attrs['Date / Time Opened']) ??
            asEpoch(attrs.DateOpened) ??
            asEpoch(attrs.CreatedDate),
          source: 'hubNashville 311',
        });
      })
      .filter((item): item is CityEvent => item != null);
    return {
      events,
      health: feed('civic', 'hubNashville 311', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('civic', 'hubNashville 311', 'offline', 0, String(error)) };
  }
}

async function fetchNashvilleClosures(): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  try {
    const features = await queryArcGis(`${NASHVILLE_FS}/NERVE_Road_Closures_view/FeatureServer/0/query`, {
      where: "Status <> 'Closed' OR Status IS NULL",
      resultRecordCount: '40',
    });
    const events = features.map((feature, index) => {
      const attrs = feature.attributes ?? {};
      const point = centroidFromGeometry(feature.geometry);
      return eventFrom({
        id: `nerve-${asString(attrs.OBJECTID) ?? index}`,
        category: 'traffic',
        severity: 'watch',
        title: asString(attrs.street) ? `Closure: ${asString(attrs.street)}` : 'Road closure',
        description: [asString(attrs.reason), asString(attrs.laneimpact), asString(attrs.description)]
          .filter(Boolean)
          .join(' · '),
        latitude: point?.lat,
        longitude: point?.lng,
        timestamp: asEpoch(attrs.starttime),
        source: 'NERVE closures',
      });
    });
    return {
      events,
      health: feed('closures', 'NERVE road closures', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('closures', 'NERVE road closures', 'offline', 0, String(error)) };
  }
}

async function fetchSmartway(city: CityConfig): Promise<{ events: CityEvent[]; health: FeedHealth }> {
  if (city.state !== 'TN') {
    return { events: [], health: feed('traffic', 'TDOT SmartWay', 'unavailable', 0, 'Tennessee highways only') };
  }
  try {
    const { west, south, east, north } = city.bbox;
    const features = await queryArcGis(SMARTWAY_EVENTS, {
      where: '1=1',
      geometry: `${west},${south},${east},${north}`,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      resultRecordCount: '80',
    });
    const events = features
      .map((feature) => {
        const attrs = feature.attributes ?? {};
        const point = centroidFromGeometry(feature.geometry);
        if (!inBbox(point?.lng, point?.lat, city.bbox)) return null;
        const kind = asString(attrs.EVENT_TYPE) ?? asString(attrs.CD_EVENT_TYPE) ?? 'Traffic event';
        const severity: EventSeverity = /accident|crash|incident/i.test(kind) ? 'alert' : 'watch';
        return eventFrom({
          id: `smartway-${asString(attrs.ID) ?? asString(attrs.OBJECTID)}`,
          category: 'traffic',
          severity,
          title: kind,
          description: [
            asString(attrs.CD_ROAD_NAMES),
            asString(attrs.CD_DIRECTION),
            asString(attrs.DESCRIPTION),
            asString(attrs.VEHICLE_IMPACT),
          ]
            .filter(Boolean)
            .join(' · '),
          latitude: point?.lat,
          longitude: point?.lng,
          timestamp: asEpoch(attrs.REVISED_DATE) ?? asEpoch(attrs.START_DATE),
          source: 'TDOT SmartWay',
        });
      })
      .filter((item): item is CityEvent => item != null);
    return {
      events,
      health: feed('traffic', 'TDOT SmartWay', events.length ? 'online' : 'empty', events.length),
    };
  } catch (error) {
    return { events: [], health: feed('traffic', 'TDOT SmartWay', 'offline', 0, String(error)) };
  }
}

export async function buildCityFeed(city: CityConfig): Promise<CityFeedResponse> {
  const common = await Promise.allSettled([fetchWeather(city), fetchAircraft(city), fetchWater(city)]);
  const weather = settled(common[0], {
    events: [] as CityEvent[],
    health: feed('weather', 'National Weather Service', 'offline', 0),
  });
  const aircraft = settled(common[1], {
    events: [] as CityEvent[],
    health: feed('aircraft', 'OpenSky aircraft', 'offline', 0),
  });
  const water = settled(common[2], {
    events: [] as CityEvent[],
    health: feed('water', 'USGS river gauges', 'offline', 0),
  });

  const localFeeds: Array<{ events: CityEvent[]; health: FeedHealth }> = [];

  if (city.id === 'louisville') {
    const [cameras, civic, crime] = await Promise.allSettled([
      fetchKyCameras(city),
      fetchLouisville311(city),
      fetchLouisvilleCrime(city),
    ]);
    localFeeds.push(
      settled(cameras, { events: [], health: feed('cameras', 'KYTC / TRIMARC cameras', 'offline', 0) }),
      settled(civic, { events: [], health: feed('civic', 'Louisville Metro 311', 'offline', 0) }),
      settled(crime, { events: [], health: feed('crime', 'LMPD crime reports', 'offline', 0) }),
      {
        events: [],
        health: feed('police', 'Live police CAD', 'unavailable', 0, 'Louisville does not publish live CAD'),
      },
    );
  } else if (city.id === 'nashville') {
    const [police, fire, civic, closures, traffic, cameras] = await Promise.allSettled([
      fetchNashvillePolice(),
      fetchNashvilleFire(),
      fetchNashville311(city),
      fetchNashvilleClosures(),
      fetchSmartway(city),
      fetchTnCameras(city),
    ]);
    localFeeds.push(
      settled(police, { events: [], health: feed('police', 'MNPD active dispatch', 'offline', 0) }),
      settled(fire, { events: [], health: feed('fire', 'NFD active incidents', 'offline', 0) }),
      settled(civic, { events: [], health: feed('civic', 'hubNashville 311', 'offline', 0) }),
      settled(closures, { events: [], health: feed('closures', 'NERVE road closures', 'offline', 0) }),
      settled(traffic, { events: [], health: feed('traffic', 'TDOT SmartWay', 'offline', 0) }),
      settled(cameras, { events: [], health: feed('cameras', 'TDOT SmartWay cameras', 'offline', 0) }),
    );
  } else {
    const cameras = await fetchKyCameras(city);
    localFeeds.push(
      cameras,
      {
        events: [],
        health: feed(
          'police',
          'Live police / fire CAD',
          'unavailable',
          0,
          'Bowling Green does not publish a public live CAD feed',
        ),
      },
    );
  }

  const all = [weather, aircraft, water, ...localFeeds];
  const events = all
    .flatMap((item) => item.events)
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  return {
    city: city.id,
    generatedAt: Date.now(),
    weather: weather.weather,
    events,
    feeds: all.map((item) => item.health),
  };
}
