// Lista de proxies disponibles
export const proxyList = [
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@104.207.58.223:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@216.26.225.198:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@216.26.247.171:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@216.26.232.64:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@216.26.226.52:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@65.111.14.38:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@217.181.92.249:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@151.123.177.162:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@104.207.57.208:3129",
  "g3lbqr5h7jwe:y5r2sn6njfc5bhq@217.181.92.252:3129"
  // ... puedes agregar más proxies de tu lista
];

// Función para obtener un proxy aleatorio
export function getRandomProxy() {
  return proxyList[Math.floor(Math.random() * proxyList.length)];
}

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
    name: "CANAL AMERICA",
    status: "ACTIVO",
    ads: false,
    stream: "https://live-bd1.tv360.bitel.com.pe/manifest/america/playlist_clean_source_720p.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 3,
    name: "ANALISTAS TV (EN INGLES)",
    status: "ACTIVO",
    ads: false,
    stream: "https://sportsgrid-plex.amagi.tv/playlist720p.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 4,
    name: "ESPN 1",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.83.2.182:8090/ESPN/index.m3u8",
    useProxy: false
  },
  {
    id: 5,
    name: "CLARO SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "https://d1seb4wyirpp71.cloudfront.net/live/75898381-5c0a-4506-8ce0-98959aed7356/live.isml/live-audio_0=96000-video=2000000.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },

  {
  id: 7,
  name: "FOX SPORTS",
  status: "ACTIVO",
  ads: false,
  stream: "http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8",
  useProxy: false
},
{
    id: 8,
    name: "Cazé TV",
    status: "ACTIVO",
    ads: false,
    stream: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8"
  },
  {
    id: 9,
    name: "ESPN 3",
    status: "ACTIVO",
    ads: false,
    stream: " http://190.83.2.182:8090/ESPN3/index.m3u8"
  },
   {
    id: 10,
    name: "ESPN 4",
    status: "ACTIVO",
    ads: false,
    stream: "http://181.78.197.59:8000/play/a07n/index.m3u8"
  },
  {
    id: 11,
    name: "TUDN",
    status: "ACTIVO",
    ads: false,
    stream: "https://streamer.metronethn.com/TUDN/index.m3u8"
  },
  {
    id: 12,
    name: "CBS SPORT GOLAZO",
    status: "ACTIVO",
    ads: false,
    stream: "https://stitcher-ipv4.pluto.tv/v2/stitch/embed/hls/channel/63a0e33a45264d000850ed7e/master.m3u8?deviceType=samsung-tvplus&deviceMake=samsung&deviceModel=samsung&deviceVersion=unknown&appVersion=unknown&deviceLat=0&deviceLon=0&deviceDNT=%7BTARGETOPT%7D&deviceId=%7BPSID%7D&advertisingId=%7BPSID%7D&us_privacy=%7BUS_PRIVACY%7D&samsung_app_domain=%7BAPP_DOMAIN%7D&samsung_app_name=%7BAPP_NAME%7D&profileLimit=&profileFloor=&embedPartner=samsung-tvplus&masterJWTPassthrough=1&authToken=eyJhbGciOiJIUzI1NiIsImtpZCI6ImQyZGEzNDMzLTYwYTEtNGYxZi1iNTMzLWFlN2E0MDE5Zjk0MiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVyIjoic2Ftc3VuZ3R2cGx1cyIsImZlYXR1cmVzIjp7Im11bHRpUG9kQWRzIjp7ImNvaG9ydCI6IiIsImVuYWJsZWQiOnRydWV9LCJzdGl0Y2hlckhsc05nIjp7ImRlbXV4ZWRBdWRpbyI6ImRpc2FibGVkIn0sInN0aXRjaGVySGxzTmdWbGwiOnsiZW5hYmxlZCI6dHJ1ZX0sInN0aXRjaGVyUGFydG5lclNob3dTbGF0ZSI6eyJlbmFibGVkIjp0cnVlfX0sImlzcyI6InNlcnZpY2UtcGFydG5lci1hdXRoLnBsdXRvLnR2Iiwic3ViIjoicHJpOnYxOnBsdXRvOmRldmljZXM6YzJGdGMzVnVaM1IyY0d4MWN3PT0iLCJhdWQiOiIqLnBsdXRvLnR2IiwiZXhwIjoxNzg3MDMwODQ4LCJpYXQiOjE3ODY5NDQ0NDgsImp0aSI6ImY1M2NiMmVmLTEwOGEtNDE0Yy05YTNiLWIwNzY5NmI4NDFlNSJ9.MLKymVQTh6QtuwQ4i1u7QKi6sRK0_0XQGX_be3z53Eo"
  },
  {
    id: 13,
    name: "BEIN 1",
    status: "ACTIVO",
    ads: false,
    stream: "https://1nyaler.streamhostingcdn.top/stream/23/index.m3u8"
  },
   {
    id: 14,
    name: "MOVISTAR LIGA DE DEPORTES",
    status: "ACTIVO",
    ads: false,
    stream: "https://7nyaler.streamhostingcdn.top/stream/36/index.m3u8"
  },
];