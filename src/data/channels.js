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
  { id: 66, name: "BEIN SPORTS 1 USA", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/beIN%20SPORTS%201/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 67, name: "BEIN SPORTS 2 USA", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/beIN%20SPORTS%202/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 68, name: "BEIN SPORTS 3 USA", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/beIN%20SPORTS%203/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 3, name: "BEIN SPORTS EXTRA Ñ (español)", status: "ACTIVO", ads: false, stream: "https://aegis-cloudfront-1.tubi.video/01f6c149-449b-4248-8bda-2278799205ec/playlist.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 65, name: "BEIN SPORTS USA", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/beIN%20SPORTS/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
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
  { id: 20, name: "MLB TV", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/MLB%20Network/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 21, name: "MOVISTAR DEPORTES", status: "ACTIVO", ads: false, stream: "https://7nyaler.streamhostingcdn.top/stream/18/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 22, name: "MOVISTAR LIGA DE DEPORTES", status: "ACTIVO", ads: false, stream: "https://7nyaler.streamhostingcdn.top/stream/36/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 24, name: "NBC SPORTS", status: "ACTIVO", ads: false, stream: "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008", type: "m3u8", geoRestriction: "USA", useProxy: true },
  { id: 69, name: "NESN (BOSTON)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/NESN/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 25, name: "NFL CHANNEL", status: "ACTIVO", ads: false, stream: "https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 26, name: "NHL NETWORK", status: "ACTIVO", ads: false, stream: "https://nhl-firetv.amagi.tv/playlist.m3u8", type: "m3u8", geoRestriction: "USA", useProxy: true },
  { id: 51, name: "NYMSPORTS", status: "ACTIVO", ads: false, stream: "https://thm-it-roku.otteravision.com/thm/it/it.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 72, name: "PREMIERE 1 (BRASIL)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Premiere%201/br`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 73, name: "SKY SPORTS ACTION", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Action/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 74, name: "SKY SPORTS ARENA", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Arena/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 75, name: "SKY SPORTS CRICKET", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Cricket/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 76, name: "SKY SPORTS F1", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20F1/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 77, name: "SKY SPORTS FOOTBALL", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Football/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 78, name: "SKY SPORTS GOLF", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Golf/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 79, name: "SKY SPORTS MAIN EVENT", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Main%20Event/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 80, name: "SKY SPORTS MIX", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Mix/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 52, name: "SKY SPORTS NFL", status: "ACTIVO", ads: false, stream: "http://stream.bottledesk.net/p/AQNASgYGemc/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 28, name: "SKY SPORTS PREMIER LEAGUE", status: "ACTIVO", ads: false, stream: "http://stream.bottledesk.net/p/AAxBRQEBc2c/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 81, name: "SKY SPORTS RACING", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Racing/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 29, name: "SKY SPORTS TENNIS", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sky%20Sports%20Tennis/gb`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 54, name: "SPORTSNET 360", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20360/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 30, name: "SPORTSNET BLUE JAYS", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20Ontario/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 31, name: "SPORTSNET DODGERS (SNLA)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20LA/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 55, name: "SPORTSNET EAST", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20East/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 70, name: "SPORTSNET NEW YORK (METS)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/SportsNet%20New%20York/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 56, name: "SPORTSNET ONE", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20One/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 57, name: "SPORTSNET ONTARIO", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20Ontario/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 58, name: "SPORTSNET WEST", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20West/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 59, name: "SPORTSNET WORLD", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Sportsnet%20World/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 50, name: "STAR SPORTS 1", status: "ACTIVO", ads: false, stream: "http://41.205.93.154/STARSPORTS1/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 32, name: "TELEMUNDO DEPORTES", status: "ACTIVO", ads: false, stream: "https://d1rqgw5gocwo9i.cloudfront.net/manifest/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-nbcu-stitched/6a4c908e-7980-4fcb-93e3-584472a5f9a3/4.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 53, name: "TENNIS CHANNEL", status: "ACTIVO", ads: false, stream: "https://cdn-ue1-prod.tsv2.amagi.tv/linear/amg01444-tennischannelth-tennischannelnl-samsungnl/playlist.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: true },
  { id: 71, name: "TNT (USA)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TNT/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 44, name: "TNT SPORTS CHILE", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TNT%20Sports/cl`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 60, name: "TSN 1", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TSN%201/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 61, name: "TSN 2", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TSN%202/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 62, name: "TSN 3", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TSN%203/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 63, name: "TSN 4", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TSN%204/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 64, name: "TSN 5", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/TSN%205/ca`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 33, name: "TUDN", status: "ACTIVO", ads: false, stream: "http://200.115.120.1:8000/play/ca039/index.m3u8", type: "m3u8", geoRestriction: "NONE", useProxy: false },
  { id: 43, name: "YES NETWORK (YANKEES)", status: "ACTIVO", ads: false, stream: `${CDN_API_BASE}/tv/cdnlivetv/Yes%20Network/us`, type: "m3u8", geoRestriction: "NONE", useProxy: false },
];


export default channels;
