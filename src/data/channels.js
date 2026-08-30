// Lista de proxies disponibles (descomenta y rellena si quieres usar proxies
// HTTP para el origin server). La función getRandomProxy() asume que exista.
/*
export const proxyList = [
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@104.207.58.223:3129",
  ...
];
export function getRandomProxy() {
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}
*/

export const channels = [
  {
    id: 1,
    name: "TyC SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "http://45.181.87.106/TYCSPORTSHD/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 2,
    name: "ANALISTAS TV (EN INGLES)",
    status: "ACTIVO",
    ads: false,
    stream: "https://sportsgrid-plex.amagi.tv/playlist720p.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 3,
    name: "ESPN 1",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.83.2.182:8090/ESPN/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 4,
    name: "ESPN 5 (BRASIL)",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.83.85.68/fox_sports_2/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 5,
    name: "ESPN 1 (BRASIL)",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.83.85.68/espn/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 6,
    name: "ESPN 3",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.83.2.182:8090/ESPN3/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 7,
    name: "ESPN 4",
    status: "ACTIVO",
    ads: false,
    stream: "http://181.78.197.59:8000/play/a07n/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
   {
    id: 8,
    name: "BEIN SPORTS EXTRA Ñ (español)",
    status: "ACTIVO",
    ads: false,
    stream: "https://aegis-cloudfront-1.tubi.video/01f6c149-449b-4248-8bda-2278799205ec/playlist.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 9,
    name: "BEIN SPORTS XTRA (ingles)",
    status: "ACTIVO",
    ads: false,
    stream: "https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 10,
    name: "BEIN 1",
    status: "ACTIVO",
    ads: false,
    stream: "https://1nyaler.streamhostingcdn.top/stream/23/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 11,
    name: "FOX SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-5a74b8e1e22a61737979c6bf.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 12,
    name: "FS1 (MLB - NFL Y MAS)",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 13,
    name: "CBS SPORT GOLAZO",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-63a0e33a45264d000850ed7e.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 14,
    name: "CANAL 4 (SOLO MLB)",
    status: "ACTIVO",
    ads: false,
    type: "iframe",
    stream: "https://geo.dailymotion.com/player.html?video=x7rwv8c",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 15,
    name: "CLARO SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "https://d1seb4wyirpp71.cloudfront.net/live/75898381-5c0a-4506-8ce0-98959aed7356/live.isml/live-audio_0=96000-video=2000000.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 16,
    name: "Cazé TV",
    status: "ACTIVO",
    ads: false,
    stream: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 17,
    name: "TUDN",
    status: "ACTIVO",
    ads: false,
    stream: "https://streamer.metronethn.com/TUDN/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 18,
    name: "MOVISTAR LIGA DE DEPORTES",
    status: "ACTIVO",
    ads: false,
    stream: "https://7nyaler.streamhostingcdn.top/stream/36/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  
  {
    id: 19,
    name: "ESPN USA",
    status: "ACTIVO",
    ads: false,
    stream: "http://23.237.104.106:8080/USA_ESPNU/tracks-v1a1/mono.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },

  {
    id: 20,
    name: "TELEMUNDO DEPORTES",
    status: "ACTIVO",
    ads: false,
    stream: "https://d1rqgw5gocwo9i.cloudfront.net/manifest/3fec3e5cac39a52b2132f9c66c83dae043dc17d4/prod_default_xumo-nbcu-stitched/6a4c908e-7980-4fcb-93e3-584472a5f9a3/4.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 21,
    name: "WIN SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "http://138.121.15.230:9002/WIN-SPORT/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },

  {
    id: 22,
    name: "NBC SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "https://d4whmvwm0rdvi.cloudfront.net/10007/99993008/hls/master.m3u8?ads.xumo_channelId=99993008",
    geoRestriction: "USA",
    useProxy: true
  },
  {
    id: 23,
    name: "NFL CHANNEL",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 24,
    name: "GOLAZO NETWORK",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-63a0e33a45264d000850ed7e.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 25,
    name: "MOVISTAR DEPORTES",
    status: "ACTIVO",
    ads: false,
    stream: "https://7nyaler.streamhostingcdn.top/stream/18/index.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 26,
    name: "TNT SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "http://38.252.215.33:8000/play/a00i/75622127.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 27,
    name: "CANAL AMERICA",
    status: "ACTIVO",
    ads: false,
    stream: "http://38.252.215.33:8000/play/a006/10833287.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 28,
    name: "NBA TV",
    status: "ACTIVO",
    ads: false,
    stream: "https://cdn1.ayitistream.com/NBATV/index.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 29,
    name: "NHL NETWORK",
    status: "ACTIVO",
    ads: false,
    stream: "https://nhl-firetv.amagi.tv/playlist.m3u8",
    geoRestriction: "USA",
    useProxy: true
  },
  {
    id: 30,
    name: "DSPORTS",
    status: "CAIDO",
    ads: false,
    stream: "http://38.252.215.33:8000/play/a00q/46330021.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 31,
    name: "FOX MEXICO",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-5a74b8e1e22a61737979c6bf.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 32,
    name: "MLB TV",
    status: "ACTIVO",
    ads: false,
    stream: "https://jmp2.uk/plu-5e66968a70f34c0007d050be.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },

];