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
    stream: "http://190.60.36.103:8000/play/a01i/55069115.m3u8",
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
    name: "BEIN SPORTS XTRA op2",
    status: "ACTIVO",
    ads: false,
    stream: "https://bein-beinxtrasports-firetv.amagi.tv/playlist.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 9,
    name: "BEIN 1",
    status: "ACTIVO",
    ads: false,
    stream: "https://1nyaler.streamhostingcdn.top/stream/23/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 10,
    name: "FOX SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "http://85.237.89.160:9590/usa-s/FOX-SPORTS-1/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 11,
    name: "FS1 (MLB - NFL Y MAS)",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.11.225.124:5000/live/fs1_hd/playlist.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 12,
    name: "CBS SPORT GOLAZO",
    status: "ACTIVO",
    ads: false,
    stream: "https://stitcher-ipv4.pluto.tv/v2/stitch/embed/hls/channel/63a0e33a45264d000850ed7e/master.m3u8?deviceType=samsung-tvplus&deviceMake=samsung&deviceModel=samsung&deviceVersion=unknown&appVersion=unknown&deviceLat=0&deviceLon=0&deviceDNT=%7BTARGETOPT%7D&deviceId=%7BPSID%7D&advertisingId=%7BPSID%7D&us_privacy=%7BUS_PRIVACY%7D&samsung_app_domain=%7BAPP_DOMAIN%7D&samsung_app_name=%7BAPP_NAME%7D&profileLimit=&profileFloor=&embedPartner=samsung-tvplus&masterJWTPassthrough=1&authToken=eyJhbGciOiJIUzI1NiIsImtpZCI6ImQyZGEzNDMzLTYwYTEtNGYxZi1iNTMzLWFlN2E0MDE5Zjk0MiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVyIjoic2Ftc3VuZ3R2cGx1cyIsImZlYXR1cmVzIjp7Im11bHRpUG9kQWRzIjp7ImNvaG9ydCI6IiIsImVuYWJsZWQiOnRydWV9LCJzdGl0Y2hlckhsc05nIjp7ImRlbXV4ZWRBdWRpbyI6ImRpc2FibGVkIn0sInN0aXRjaGVySGxzTmdWbGwiOnsiZW5hYmxlZCI6dHJ1ZX0sInN0aXRjaGVyUGFydG5lclNob3dTbGF0ZSI6eyJlbmFibGVkIjp0cnVlfX0sImlzcyI6InNlcnZpY2UtcGFydG5lci1hdXRoLnBsdXRvLnR2Iiwic3ViIjoicHJpOnYxOnBsdXRvOmRldmljZXM6YzJGdGMzVnVaM1IyY0d4MWN3PT0iLCJhdWQiOiIqLnBsdXRvLnR2IiwiZXhwIjoxNzg3MDMwODQ4LCJpYXQiOjE3ODY5NDQ0NDgsImp0aSI6ImY1M2NiMmVmLTEwOGEtNDE0Yy05YTNiLWIwNzY5NmI4NDFlNSJ9.MLKymVQTh6QtuwQ4i1u7QKi6sRK0_0XQGX_be3z53Eo",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 13,
    name: "CANAL 4 (SOLO MLB)",
    status: "ACTIVO",
    ads: false,
    stream: "https://live.eu-north-1a.cf.dmcdn.net/sec2(PJPIhPvsIJV-CCZPtMNW1uVR8cmfdN9V0mBVTmqCJWwP1L-fksw-j0GLsteerT5ukRl8yGbnbaxZNnNN6fXkHAs47M4owhtaEyS4pQXBd0VWSQYjc1MZlK6F1T00sxQX)/dm/3/x7rwv8c/s/live-480.m3u8#cell=lcf-eu-north-1a",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 14,
    name: "CLARO SPORTS",
    status: "ACTIVO",
    ads: false,
    stream: "https://d1seb4wyirpp71.cloudfront.net/live/75898381-5c0a-4506-8ce0-98959aed7356/live.isml/live-audio_0=96000-video=2000000.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 15,
    name: "Cazé TV",
    status: "ACTIVO",
    ads: false,
    stream: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/Caze_TV.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 16,
    name: "TUDN",
    status: "ACTIVO",
    ads: false,
    stream: "https://streamer.metronethn.com/TUDN/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 17,
    name: "MOVISTAR LIGA DE DEPORTES",
    status: "ACTIVO",
    ads: false,
    stream: "https://7nyaler.streamhostingcdn.top/stream/36/index.m3u8",
    geoRestriction: "NONE",
    useProxy: false
  },
  {
    id: 18,
    name: "ESPN COLOMBIA",
    status: "ACTIVO",
    ads: false,
    stream: "http://190.60.46.228:8888/play/a05u/index.m3u8",
    geoRestriction: "NONE",
    useProxy: true
  },
  {
    id: 19,
    name: "TUBI SPORTS (USA)",
    status: "ACTIVO",
    ads: false,
    stream: "https://live-manifest.production-public.tubi.io/live/79123cfa-756c-4d5e-9f66-26755a4cd5c8/playlist.m3u8?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJjb3VudHJ5IjoiVVMiLCJkZXZpY2VfaWQiOiIzY2ZlNmNkYS0xZTZjLTQ4MGMtOWYyMS1jMmRlNjJhNGFjNWUiLCJleHAiOjE3ODc2ODk5OTgsImlzcyI6ImxpdmVfbmV3c19tYW5pZmVzdCIsInBsYXRmb3JtIjoiV0VCIiwicnNzIjoiYXB2MjpuZmwtY2hhbm5lbC1kem5jdWQiLCJ1c2VyX2lkIjowfQ.eadp3wDSsm286Yf0uVrA24lGqNunOO_s1R5RQbAQ0Ryu1_PhmG__iLsBn28-Uq3S-iL5hjZaTDsZFstu7RlPvA&tb.sid=88a98fed-e1df-4704-bc8b-0fe99d9f7e34&ap-fb=aHR0cHM6Ly9saXZlLW1hbmlmZXN0LnByb2R1Y3Rpb24tcHVibGljLnR1YmkuaW8vbGl2ZS83OTEyM2NmYS03NTZjLTRkNWUtOWY2Ni0yNjc1NWE0Y2Q1YzgvcGxheWxpc3QubTN1OD90b2tlbj1leUpoYkdjaU9pSklVelV4TWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKamIzVnVkSEo1SWpvaVZWTWlMQ0prWlhacFkyVmZhV1FpT2lJelkyWmxObU5rWVMweFpUWmpMVFE0TUdNdE9XWXlNUzFqTW1SbE5qSmhOR0ZqTldVaUxDSmxlSEFpT2pFM09EYzJPRGs1T1Rnc0ltbHpjeUk2SW14cGRtVmZibVYzYzE5dFlXNXBabVZ6ZENJc0luQnNZWFJtYjNKdElqb2lWMFZDSWl3aWNuTnpJam9pY21NNmFIUjBjSE02THk5aFpXZHBjeTFqYkc5MVpHWnliMjUwTFRFdWRIVmlhUzUyYVdSbGJ5OWxPVGhtT1RNNE5TMHlaRGN6TFRRek5USXRZbUppTUMweVpUTTFOamM1T1RWaE9HVXZjR3hoZVd4cGMzUXViVE4xT0NJc0luVnpaWEpmYVdRaU9qQjkucVVLc3prTVB6YV9McGtpWUFXS3Y5Vm1ZajlDT2hxUTI2ZFhUVzU5d2o5OEkzVVdvRVgydnY0Qm53aEMwZVBTbWJKS2NyaE80TWxDUXEyemhlZUJTaWcmdGIuc2lkPTkyZTY3ODc5LWY4YmMtNDk0YS1iNTFlLTA3NWRhODNjMTY3NQ&app_id=tubitv&app_mode=DEFAULT_MODE&content_id=613761&content_type=mp4&device_id=3cfe6cda-1e6c-480c-9f21-c2de62a4ac5e&language=en&now_pos=0&pub_id=11cd1845cf46794a6463bb4eade05c60&vpaid_enabled=false&gdpr=0&platform=WEB&ap.pt=2&ap.furl=0",
    geoRestriction: "USA",
    useProxy: true
  }
];