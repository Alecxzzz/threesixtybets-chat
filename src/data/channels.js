// Canales extraídos del frontend (dist) — mismos objetos que devuelve /channels del backend.
// Ordenados alfabéticamente por nombre.
//
// CDN LIVE TV (dinámicos): los canales de cdnlivetv.tv NO llevan token fijo en el
// stream — el backend resuelve el token fresco en cada sintonizada vía
// /tv/cdnlivetv/{canal}/{codigo} y entrega el stream por el /hls-proxy existente.
// CDN_API_BASE: déjalo vacío si el frontend se sirve desde el MISMO dominio que el
// backend (Northflank). Si el frontend vive en otro dominio (ej. Vercel), pon aquí
// la URL pública del backend, ej: "https://tu-servicio.northflank.app"
const CDN_API_BASE = "";

export const channels = [
  { id: 1, name: "ANALISTAS TV (EN INGLES)", status: "ACTIVO", ads: false, stream: "https://sportsgrid-plex.amagi.tv/playlist720p.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 2, name: "BEIN 1", status: "ACTIVO", ads: false, stream: "https://1nyaler.streamhostingcdn.top/stream/23/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 3, name: "BEIN SPORTS EXTRA Ñ (español)", status: "ACTIVO", ads: false, stream: "https://aegis-cloudfront-1.tubi.video/01f6c149-449b-4248-8bda-2278799205ec/playlist.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 4, name: "BEIN SPORTS XTRA (ingles)", status: "ACTIVO", ads: false, stream: "https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 7, name: "CBS UEFA CHAMPIONS LEAGUE", status: "ACTIVO", ads: false, stream: "https://jmp2.uk/plu-65ea8b928145cb0008509426.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 8, name: "CLARO SPORTS", status: "ACTIVO", ads: false, stream: "https://d1seb4wyirpp71.cloudfront.net/live/75898381-5c0a-4506-8ce0-98959aed7356/live.isml/live-audio_0=96000-video=2000000.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 40, name: "CLARO SPORTS 2", status: "ACTIVO", ads: false, stream: "http://168.196.127.137:6001/play/a09d/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 9, name: "ESPN 1", status: "ACTIVO", ads: false, stream: "http://45.167.2.101:8000/play/a0py/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 10, name: "ESPN 2", status: "ACTIVO", ads: false, stream: "http://168.228.44.241:9997/play/a01c/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 12, name: "ESPN 4", status: "ACTIVO", ads: false, stream: "http://181.78.197.59:8000/play/a07n/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 36, name: "ESPN 5", status: "ACTIVO", ads: false, stream: "http://168.228.44.241:9997/play/a091/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 37, name: "ESPN 6", status: "ACTIVO", ads: false, stream: "http://168.228.44.241:9997/play/a01f/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 13, name: "ESPN USA", status: "ACTIVO", ads: false, stream: "http://stream.bottledesk.net/6500/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 39, name: "EUROSPORT 2", status: "ACTIVO", ads: false, stream: "http://200.115.120.1:8000/play/ca119/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 14, name: "FOX DEPORTES (ESPAÑOL)", status: "ACTIVO", ads: false, stream: "http://23.237.104.106:8080/USA_FOX_DEPORTES/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 15, name: "FOX SPORTS", status: "ACTIVO", ads: false, stream: "https://jmp2.uk/plu-5a74b8e1e22a61737979c6bf.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 41, name: "FOX SPORTS 2", status: "ACTIVO", ads: false, stream: "http://200.115.120.1:8000/play/ca126/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 19, name: "GOLAZO NETWORK", status: "ACTIVO", ads: false, stream: "https://jmp2.uk/plu-63a0e33a45264d000850ed7e.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 21, name: "MOVISTAR DEPORTES", status: "ACTIVO", ads: false, stream: "https://7nyaler.streamhostingcdn.top/stream/18/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 22, name: "MOVISTAR LIGA DE DEPORTES", status: "ACTIVO", ads: false, stream: "https://7nyaler.streamhostingcdn.top/stream/36/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 24, name: "NBC SPORTS", status: "ACTIVO", ads: false, stream: "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008", type: "m3u8", geoRestriction: "USA", useProxy: true },
  { id: 25, name: "NFL CHANNEL", status: "ACTIVO", ads: false, stream: "https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 26, name: "NHL NETWORK", status: "ACTIVO", ads: false, stream: "https://nhl-firetv.amagi.tv/playlist.m3u8", type: "m3u8", geoRestriction: "USA", useProxy: true },
  { id: 51, name: "NYMSPORTS", status: "ACTIVO", ads: false, stream: "https://thm-it-roku.otteravision.com/thm/it/it.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 52, name: "SKY SPORTS NFL", status: "ACTIVO", ads: false, stream: "http://stream.bottledesk.net/p/AQNASgYGemc/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 28, name: "SKY SPORTS PREMIER LEAGUE", status: "ACTIVO", ads: false, stream: "http://stream.bottledesk.net/p/AAxBRQEBc2c/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 50, name: "STAR SPORTS 1", status: "ACTIVO", ads: false, stream: "http://41.205.93.154/STARSPORTS1/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 32, name: "TELEMUNDO DEPORTES", status: "ACTIVO", ads: false, stream: "https://d1rqgw5gocwo9i.cloudfront.net/manifest/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-nbcu-stitched/6a4c908e-7980-4fcb-93e3-584472a5f9a3/4.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 53, name: "TENNIS CHANNEL", status: "ACTIVO", ads: false, stream: "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 33, name: "TUDN", status: "ACTIVO", ads: false, stream: "http://200.115.120.1:8000/play/ca039/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
];


export default channels;
