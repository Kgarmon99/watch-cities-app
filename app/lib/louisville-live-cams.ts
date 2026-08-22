import type { CityConfig, CityEvent, CityId } from './types';
import { earthCamProxyUrl } from './earthcam';
import { resolveWetmet, wetmetEmbedUrl } from './wetmet';
import {
  inspectYouTubeVideo,
  resolveYouTubeLiveHandle,
  youtubeEmbedUrl,
  youtubeThumbUrl,
} from './youtube-live';

interface KnownLiveCam {
  id: string;
  cityId: CityId;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  source: string;
  videoId?: string;
  handle?: string;
  wetmetUid?: string;
  earthCamUrl?: string;
  mediaUrl?: string;
  embedUrl?: string;
}

const KNOWN_LIVE_CAMS: KnownLiveCam[] = [
  {
    id: 'lou-live-ohio-river',
    cityId: 'louisville',
    title: 'Ohio River · Louisville skyline',
    description:
      '24/7 StreamTime LIVE camera at Upland Jeffersonville, looking across the river at downtown Louisville and the bridges.',
    latitude: 38.2726,
    longitude: -85.7395,
    source: 'StreamTime LIVE',
    videoId: 'MqzQdTHCTOg',
  },
  {
    id: 'lou-live-earthcam-ohio-river',
    cityId: 'louisville',
    title: 'Ohio River · River Park Place',
    description:
      'EarthCam live view of the Ohio River, River Park Place Marina, and the Louisville riverfront path.',
    latitude: 38.2657,
    longitude: -85.7235,
    source: 'EarthCam',
    earthCamUrl: 'https://www.earthcam.com/usa/kentucky/louisville/',
  },
  {
    id: 'lou-live-whas-downtown',
    cityId: 'louisville',
    title: 'Downtown riverfront',
    description: 'WHAS11 downtown Louisville camera over the riverfront and skyline.',
    latitude: 38.257,
    longitude: -85.755,
    source: 'WHAS11',
    wetmetUid: '8fe79ea9a3a6d93b87cde5f59e709e0f',
  },
  {
    id: 'lou-live-whas-metro',
    cityId: 'louisville',
    title: 'Louisville Metro',
    description: 'WHAS11 Louisville Metro weather camera.',
    latitude: 38.2527,
    longitude: -85.7585,
    source: 'WHAS11',
    wetmetUid: '7a5961dad2265cc69fe485df9e7b3c33',
  },
  {
    id: 'lou-live-whas-hurstbourne',
    cityId: 'louisville',
    title: 'Hurstbourne',
    description: 'WHAS11 weather camera over Hurstbourne.',
    latitude: 38.246,
    longitude: -85.587,
    source: 'WHAS11',
    wetmetUid: 'f9eabae9f16f97389110d18632a363b0',
  },
  {
    id: 'lou-live-whas-uofl',
    cityId: 'louisville',
    title: 'University of Louisville',
    description: 'WHAS11 campus camera at the University of Louisville.',
    latitude: 38.215,
    longitude: -85.76,
    source: 'WHAS11',
    wetmetUid: '549a5a49f5dcf11800d27b3b0b4cef27',
  },
  {
    id: 'lou-live-whas-jeffersonville',
    cityId: 'louisville',
    title: 'Jeffersonville',
    description: 'WHAS11 camera looking at Jeffersonville, across the river from Louisville.',
    latitude: 38.277,
    longitude: -85.737,
    source: 'WHAS11',
    wetmetUid: '2730db09ab0c3af02dc58cd5ae581e8f',
  },
  {
    id: 'lou-live-wdrb-downtown',
    cityId: 'louisville',
    title: 'Downtown Louisville weather cam',
    description: 'WDRB live weather camera over downtown Louisville.',
    latitude: 38.254,
    longitude: -85.76,
    source: 'WDRB',
    wetmetUid: '7431c5a55d73fc6c8601152d96d76dcf',
  },
  {
    id: 'lou-live-wdrb-new-albany',
    cityId: 'louisville',
    title: 'New Albany',
    description: 'WDRB weather camera in New Albany, looking across the river toward Louisville.',
    latitude: 38.2856,
    longitude: -85.8241,
    source: 'WDRB',
    wetmetUid: 'a703cd8e7802d523e92035ba5c727c8d',
  },
  {
    id: 'lou-live-wdrb-lynn-ptz',
    cityId: 'louisville',
    title: 'Lynn Family Stadium',
    description: 'WDRB PTZ weather camera at Lynn Family Stadium.',
    latitude: 38.2593,
    longitude: -85.7318,
    source: 'WDRB',
    wetmetUid: '0564014f61bde544e8069eb65e36b967',
  },
  {
    id: 'lou-live-wdrb-lynn-pano',
    cityId: 'louisville',
    title: 'Lynn Family Stadium panorama',
    description: 'WDRB panoramic weather camera at Lynn Family Stadium.',
    latitude: 38.2588,
    longitude: -85.733,
    source: 'WDRB',
    wetmetUid: '2a89138667023e43c44bf31d586a8ace',
  },
  {
    id: 'lou-live-wave-downtown',
    cityId: 'louisville',
    title: 'Downtown · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera over downtown Louisville.',
    latitude: 38.2532,
    longitude: -85.7572,
    source: 'WAVE3',
    wetmetUid: 'f5c72c14afbf2806817a822ae107be52',
  },
  {
    id: 'lou-live-wave-paristown',
    cityId: 'louisville',
    title: 'Paristown · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera over Paristown Point.',
    latitude: 38.2429,
    longitude: -85.7348,
    source: 'WAVE3',
    wetmetUid: '01afe5e4d5e18141ce0812f5c6b3683d',
  },
  {
    id: 'lou-live-wave-south',
    cityId: 'louisville',
    title: 'South Louisville · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera over south Louisville.',
    latitude: 38.168,
    longitude: -85.778,
    source: 'WAVE3',
    wetmetUid: 'f08effe08b244a765ced3880019b6dc5',
  },
  {
    id: 'lou-live-wave-jeffersonville',
    cityId: 'louisville',
    title: 'Jeffersonville · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Jeffersonville.',
    latitude: 38.279,
    longitude: -85.736,
    source: 'WAVE3',
    wetmetUid: '2a14a9475d56b6ce9ad1190c343a6a53',
  },
  {
    id: 'lou-live-wave-new-albany',
    cityId: 'louisville',
    title: 'New Albany · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in New Albany.',
    latitude: 38.2872,
    longitude: -85.8228,
    source: 'WAVE3',
    wetmetUid: '047b8f21a27dc1ce391909cde2ec0118',
  },
  {
    id: 'lou-live-wave-starlight',
    cityId: 'louisville',
    title: 'Starlight · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Starlight, Indiana.',
    latitude: 38.412,
    longitude: -85.888,
    source: 'WAVE3',
    wetmetUid: '86702439c1586a17f0290bba0b231401',
  },
  {
    id: 'lou-live-wave-bardstown',
    cityId: 'louisville',
    title: 'Bardstown · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Bardstown.',
    latitude: 37.8098,
    longitude: -85.4662,
    source: 'WAVE3',
    wetmetUid: '54de3317bc33474859bb263f43a974b0',
  },
  {
    id: 'lou-live-wave-etown',
    cityId: 'louisville',
    title: 'Elizabethtown · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Elizabethtown.',
    latitude: 37.6938,
    longitude: -85.858,
    source: 'WAVE3',
    wetmetUid: 'ea8e5c668c871613ed86693a48bc89d5',
  },
  {
    id: 'lou-live-wave-simpsonville',
    cityId: 'louisville',
    title: 'Simpsonville · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Simpsonville.',
    latitude: 38.2234,
    longitude: -85.3538,
    source: 'WAVE3',
    wetmetUid: 'b62bbc814703c3a097faf3c34b5377f8',
  },
  {
    id: 'lou-live-wave-corydon',
    cityId: 'louisville',
    title: 'Corydon · WAVE SkyTrack',
    description: 'WAVE3 SkyTrack camera in Corydon, Indiana.',
    latitude: 38.2116,
    longitude: -86.1248,
    source: 'WAVE3',
    wetmetUid: '8cee7ce7112b62f4d866da0f8cadeae9',
  },
  {
    id: 'lou-live-wdrb-bardstown',
    cityId: 'louisville',
    title: 'Bardstown · WDRB',
    description: 'WDRB weather camera in Bardstown.',
    latitude: 37.8092,
    longitude: -85.4676,
    source: 'WDRB',
    wetmetUid: '0fb3d0a99c070f27ac6421e7ca431d85',
  },
  {
    id: 'lou-live-wdrb-etown',
    cityId: 'louisville',
    title: 'Elizabethtown · WDRB',
    description: 'WDRB weather camera in Elizabethtown.',
    latitude: 37.6945,
    longitude: -85.8598,
    source: 'WDRB',
    wetmetUid: 'b6f5b200695b3ff3d38e477edd7af5c0',
  },
  {
    id: 'lou-live-wdrb-simpsonville',
    cityId: 'louisville',
    title: 'Simpsonville · WDRB',
    description: 'WDRB weather camera in Simpsonville.',
    latitude: 38.2226,
    longitude: -85.3552,
    source: 'WDRB',
    wetmetUid: '879a76b798f5282adce22b3652614abc',
  },
  {
    id: 'lou-live-wdrb-corydon',
    cityId: 'louisville',
    title: 'Corydon · WDRB',
    description: 'WDRB weather camera in Corydon, Indiana.',
    latitude: 38.2109,
    longitude: -86.1255,
    source: 'WDRB',
    wetmetUid: '13fb469488696838e779c64118970dd9',
  },
  {
    id: 'lou-live-wdrb-seymour',
    cityId: 'louisville',
    title: 'Seymour · WDRB',
    description: 'WDRB weather camera in Seymour, Indiana.',
    latitude: 38.9592,
    longitude: -85.8903,
    source: 'WDRB',
    wetmetUid: 'fcf1153b1033d933c9bdf3fe3f472a0e',
  },
  {
    id: 'lou-live-whas-scottsburg',
    cityId: 'louisville',
    title: 'Scottsburg · WHAS11',
    description: 'WHAS11 weather camera in Scottsburg, Indiana.',
    latitude: 38.6856,
    longitude: -85.7702,
    source: 'WHAS11',
    wetmetUid: '1c7a9498f6b559d1ee9fa163cdc3dbcf',
  },
  {
    id: 'lou-wkyt-lexington',
    cityId: 'louisville',
    title: 'Lexington downtown · WKYT',
    description: 'WKYT regional camera in downtown Lexington.',
    latitude: 38.0406,
    longitude: -84.5037,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Downtown-Lexington.jpg',
  },
  {
    id: 'lou-wkyt-etown',
    cityId: 'louisville',
    title: 'Elizabethtown traffic · WKYT',
    description: 'WKYT regional traffic camera in Elizabethtown.',
    latitude: 37.7031,
    longitude: -85.8649,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/E-town%20Cam.jpg',
  },
  {
    id: 'lou-wkyt-louisville',
    cityId: 'louisville',
    title: 'Louisville traffic · WKYT',
    description: 'WKYT regional traffic camera in Louisville.',
    latitude: 38.2527,
    longitude: -85.7585,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Louisville%20Cam.jpg',
  },
  {
    id: 'lou-wkyt-frankfort',
    cityId: 'louisville',
    title: 'Frankfort traffic · WKYT',
    description: 'WKYT regional traffic camera in Frankfort.',
    latitude: 38.2009,
    longitude: -84.8733,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Frankfort%20Traffic%20Cam.jpg',
  },
  {
    id: 'lou-wkyt-georgetown',
    cityId: 'louisville',
    title: 'Georgetown traffic · WKYT',
    description: 'WKYT regional traffic camera in Georgetown.',
    latitude: 38.2098,
    longitude: -84.5588,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Georgetown%20Traffic%20Cam.jpg',
  },
  {
    id: 'lou-wkyt-covington',
    cityId: 'louisville',
    title: 'Covington traffic · WKYT',
    description: 'WKYT regional traffic camera in Covington.',
    latitude: 39.0837,
    longitude: -84.5086,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Covington%20Cam.jpg',
  },
  {
    id: 'lou-wkyt-corbin',
    cityId: 'louisville',
    title: 'Corbin traffic · WKYT',
    description: 'WKYT regional traffic camera in Corbin.',
    latitude: 36.9487,
    longitude: -84.0969,
    source: 'WKYT weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wkyt/Corbin%20Cam.jpg',
  },
  {
    id: 'lou-live-new-albany-riverfront',
    cityId: 'louisville',
    title: 'New Albany riverfront',
    description: '24/7 live camera on the New Albany riverfront, across the Ohio River from Louisville.',
    latitude: 38.2842,
    longitude: -85.8188,
    source: 'New Albany Live',
    videoId: 'MIViwQvW6Dg',
  },
  {
    id: 'lou-live-lagrange-street-ptz',
    cityId: 'louisville',
    title: 'La Grange trains in the street',
    description: 'Live PTZ railcam of CSX trains running down Main Street in La Grange.',
    latitude: 38.4076,
    longitude: -85.378,
    source: 'Virtual Railfan',
    videoId: '9SLt3AT0rXk',
    handle: '@VirtualRailfan',
  },
  {
    id: 'lou-live-lagrange-south',
    cityId: 'louisville',
    title: 'La Grange railcam south',
    description: 'Fixed south-facing live train camera in downtown La Grange.',
    latitude: 38.4072,
    longitude: -85.3774,
    source: 'Virtual Railfan',
    videoId: '0YIKIk76Sy0',
    handle: '@VirtualRailfan',
  },
  {
    id: 'lou-live-lagrange-platform',
    cityId: 'louisville',
    title: 'La Grange observation platform',
    description: 'Live PTZ railcam from the La Grange observation platform.',
    latitude: 38.408,
    longitude: -85.3786,
    source: 'Virtual Railfan',
    videoId: 'OtssjZ3hdX0',
    handle: '@VirtualRailfan',
  },
  {
    id: 'lou-live-lagrange-museum',
    cityId: 'louisville',
    title: 'La Grange museum railcam',
    description: 'Live train camera from the museum view in La Grange.',
    latitude: 38.4068,
    longitude: -85.3788,
    source: 'Virtual Railfan',
    videoId: 'jntMnCMiZx4',
    handle: '@VirtualRailfan',
  },
  // Current Nashville catalog: https://www.newschannel5.com/weather/weather-cams
  {
    id: 'nash-live-skynet-downtown',
    cityId: 'nashville',
    title: 'Downtown · James Robertson Parkway',
    description: 'NewsChannel 5 Skynet live weather camera over downtown Nashville.',
    latitude: 36.1682,
    longitude: -86.7816,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: '100ed14b77d4158a8cdf0a3414501d2f',
  },
  {
    id: 'nash-live-skynet-acme',
    cityId: 'nashville',
    title: 'Lower Broadway · Acme Feed & Seed',
    description: 'NewsChannel 5 Skynet live camera from Acme Feed & Seed on Lower Broadway.',
    latitude: 36.1611,
    longitude: -86.7748,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'a0741e6de7429a92eaf4495dd01c8cd8',
  },
  {
    id: 'nash-live-skynet-first-horizon',
    cityId: 'nashville',
    title: 'First Horizon Park',
    description: 'NewsChannel 5 Skynet live weather camera at First Horizon Park.',
    latitude: 36.1735,
    longitude: -86.7851,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: '70689b867d7dcbcc53446a84bf3ba05d',
  },
  {
    id: 'nash-live-skynet-metro',
    cityId: 'nashville',
    title: 'Nashville Metro weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Nashville.',
    latitude: 36.1627,
    longitude: -86.7816,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'd568cf9e95a603f42d031e2ba7d73fd3',
  },
  {
    id: 'nash-live-skynet-shores',
    cityId: 'nashville',
    title: 'Nashville Shores',
    description: 'NewsChannel 5 Skynet live weather camera at Nashville Shores.',
    latitude: 36.1629,
    longitude: -86.6042,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: '1cfb14be7d91c961ca164437e43aec95',
  },
  {
    id: 'nash-live-skynet-franklin',
    cityId: 'nashville',
    title: 'Franklin weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Franklin.',
    latitude: 35.9251,
    longitude: -86.8689,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: '19147ccca2ad8a80b82dd31af8d10004',
  },
  {
    id: 'nash-live-skynet-gallatin',
    cityId: 'nashville',
    title: 'Gallatin weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Gallatin.',
    latitude: 36.3884,
    longitude: -86.4467,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'a5358a555be618521492866d1a8e4b82',
  },
  {
    id: 'nash-live-skynet-lebanon',
    cityId: 'nashville',
    title: 'Lebanon weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Lebanon.',
    latitude: 36.2081,
    longitude: -86.2911,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'b226b459cdb9cf399aa4d7fd1d99fda2',
  },
  {
    id: 'nash-live-skynet-murfreesboro',
    cityId: 'nashville',
    title: 'Murfreesboro weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Murfreesboro.',
    latitude: 35.8456,
    longitude: -86.3903,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: '7b4a53304d23ee278a43f445d0c67856',
  },
  {
    id: 'nash-live-skynet-clarksville',
    cityId: 'nashville',
    title: 'Clarksville weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Clarksville.',
    latitude: 36.5298,
    longitude: -87.3595,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'b7a35d84febc911d2ea6eefca6d142e1',
  },
  {
    id: 'nash-live-skynet-hopkinsville',
    cityId: 'nashville',
    title: 'Hopkinsville weather cam',
    description: 'NewsChannel 5 Skynet live weather camera in Hopkinsville, Kentucky.',
    latitude: 36.8656,
    longitude: -87.4886,
    source: 'NewsChannel 5 Skynet',
    wetmetUid: 'a1b5b0ded30cf29c7a4bd4329e899848',
  },
  {
    id: 'nash-live-earthcam-broadway',
    cityId: 'nashville',
    title: 'Lower Broadway · EarthCam',
    description: 'EarthCam live view from Acme Feed & Seed over Lower Broadway in downtown Nashville.',
    latitude: 36.1611,
    longitude: -86.7748,
    source: 'EarthCam',
    earthCamUrl: 'https://www.earthcam.com/usa/tennessee/nashville/',
  },
  {
    id: 'nash-live-broadway',
    cityId: 'nashville',
    title: 'Lower Broadway live',
    description: '24/7 On Broadway camera over the honky-tonk strip, with street audio.',
    latitude: 36.1608,
    longitude: -86.7784,
    source: 'On Broadway',
    videoId: 'ICva1RPK6Do',
    handle: '@OnBroadwayTN',
  },
  {
    id: 'nash-live-sunset',
    cityId: 'nashville',
    title: 'Downtown sunset cam',
    description: '24/7 horizon view from downtown Nashville toward the Capitol.',
    latitude: 36.165,
    longitude: -86.784,
    source: 'On Broadway',
    videoId: 'hVzxl2gSQ18',
    handle: '@OnBroadwayTN',
  },
  {
    id: 'nash-live-nissan-stadium',
    cityId: 'nashville',
    title: 'Downtown from Nissan Stadium',
    description: 'WSMV live camera looking back across the river toward downtown Nashville.',
    latitude: 36.1668,
    longitude: -86.7713,
    source: 'WSMV 4 Nashville',
    videoId: 'ATbtGvbExP4',
  },
  {
    id: 'nash-live-west-nashville',
    cityId: 'nashville',
    title: 'West Nashville',
    description: 'WSMV live weather camera in West Nashville.',
    latitude: 36.1515,
    longitude: -86.8598,
    source: 'WSMV 4 Nashville',
    videoId: '802ZoL3nrg8',
  },
  {
    id: 'nash-live-nolensville',
    cityId: 'nashville',
    title: 'Nolensville',
    description: 'WSMV live weather camera in Nolensville.',
    latitude: 35.9523,
    longitude: -86.6694,
    source: 'WSMV 4 Nashville',
    videoId: 'jDZSTsuyzoc',
  },
  {
    id: 'nash-live-downtown-south',
    cityId: 'nashville',
    title: 'Downtown south view',
    description: 'WSMV live camera looking south from downtown Nashville.',
    latitude: 36.1589,
    longitude: -86.7785,
    source: 'WSMV 4 Nashville',
    videoId: 's3ObT04gzlo',
  },
  {
    id: 'nash-live-downtown-northeast',
    cityId: 'nashville',
    title: 'Downtown northeast view',
    description: 'WSMV live camera over northeast downtown Nashville.',
    latitude: 36.1687,
    longitude: -86.7796,
    source: 'WSMV 4 Nashville',
    videoId: 'Gw0FXKfyBno',
  },
  // Current Bowling Green catalogs: https://www.wbko.com/weather/cams/ and https://www.wku.edu/webcams/
  {
    id: 'bg-live-east-wooster-prospect',
    cityId: 'bowling-green',
    title: 'East Wooster & Prospect',
    description: 'City of Bowling Green live traffic camera at East Wooster and Prospect.',
    latitude: 36.9962,
    longitude: -86.4388,
    source: 'City of Bowling Green GIS',
    videoId: 'HgDmRC2Was0',
  },
  {
    id: 'bg-live-east-wooster-campbell-hill',
    cityId: 'bowling-green',
    title: 'East Wooster & Campbell Hill',
    description: 'City of Bowling Green live multi-camera traffic view at East Wooster and Campbell Hill.',
    latitude: 36.993,
    longitude: -86.4297,
    source: 'City of Bowling Green GIS',
    videoId: 'ca607CoglOg',
  },
  {
    id: 'bg-live-wku-white-squirrel',
    cityId: 'bowling-green',
    title: 'WKU White Squirrel weather',
    description: 'CamStreamer live view above Western Kentucky University campus.',
    latitude: 36.9858,
    longitude: -86.456,
    source: 'CamStreamer / WKU',
    embedUrl: 'https://camstreamer.com/embed/44e54bfd7b76511/S-8704?rel=0&showinfo=0',
  },
  {
    id: 'bg-wxornot-downtown',
    cityId: 'bowling-green',
    title: 'Downtown BG facing northeast',
    description: 'WXorNOT public Nest skycam in downtown Bowling Green.',
    latitude: 36.9956,
    longitude: -86.4436,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/OlI8qF5zP1?autoplay=1',
  },
  {
    id: 'bg-wxornot-morgantown',
    cityId: 'bowling-green',
    title: 'Morgantown facing west',
    description: 'WXorNOT public Nest skycam in Morgantown.',
    latitude: 37.2256,
    longitude: -86.6836,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/oHN54MdJWl?autoplay=1',
  },
  {
    id: 'bg-wxornot-brownsville',
    cityId: 'bowling-green',
    title: 'Brownsville facing northeast',
    description: 'WXorNOT public Nest skycam in Brownsville.',
    latitude: 37.1931,
    longitude: -86.2677,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/kNR6QKxk1M?autoplay=1',
  },
  {
    id: 'bg-wxornot-lovers-ln',
    cityId: 'bowling-green',
    title: 'Lovers Lane facing west',
    description: 'WXorNOT public Nest skycam near Lovers Lane in Bowling Green.',
    latitude: 36.955,
    longitude: -86.414,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/J637U8TzU8?autoplay=1',
  },
  {
    id: 'bg-wxornot-gold-city-east',
    cityId: 'bowling-green',
    title: 'Gold City facing east',
    description: 'WXorNOT public Nest skycam in Gold City.',
    latitude: 36.742,
    longitude: -86.525,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/1N9JMCY8wH?autoplay=1',
  },
  {
    id: 'bg-wxornot-gold-city-west',
    cityId: 'bowling-green',
    title: 'Gold City facing west',
    description: 'WXorNOT public Nest skycam in Gold City.',
    latitude: 36.742,
    longitude: -86.527,
    source: 'WXorNOT SkyCams',
    embedUrl: 'https://video.nest.com/embedded/live/OtFRzVEVBY?autoplay=1',
  },
  {
    id: 'bg-wbko-aviation-heritage-park',
    cityId: 'bowling-green',
    title: 'Aviation Heritage Park',
    description: 'WBKO weather camera at Aviation Heritage Park in Bowling Green.',
    latitude: 36.9196,
    longitude: -86.4352,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/AviationPark.jpg',
  },
  {
    id: 'bg-wbko-airport',
    cityId: 'bowling-green',
    title: 'Bowling Green-Warren County Airport',
    description: 'WBKO weather camera at Bowling Green-Warren County Regional Airport.',
    latitude: 36.9676,
    longitude: -86.4172,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/BGAirport.jpg',
  },
  {
    id: 'bg-wbko-ballpark',
    cityId: 'bowling-green',
    title: 'Bowling Green Ballpark',
    description: 'WBKO weather camera overlooking Bowling Green Ballpark.',
    latitude: 36.9966,
    longitude: -86.4412,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/BGBallpark.jpg',
  },
  {
    id: 'bg-wbko-wingate',
    cityId: 'bowling-green',
    title: 'Wingate Hotel',
    description: 'WBKO weather camera at the Wingate Hotel in Bowling Green.',
    latitude: 36.9309,
    longitude: -86.4159,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/SleepInn.jpg',
  },
  {
    id: 'bg-wbko-tompkinsville',
    cityId: 'bowling-green',
    title: 'Tompkinsville',
    description: 'WBKO regional weather camera in Tompkinsville.',
    latitude: 36.7023,
    longitude: -85.6916,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Tompkinsville.jpg',
  },
  {
    id: 'bg-wbko-burkesville',
    cityId: 'bowling-green',
    title: 'Burkesville',
    description: 'WBKO regional weather camera in Burkesville.',
    latitude: 36.7903,
    longitude: -85.3705,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Burkesville.jpg',
  },
  {
    id: 'bg-wbko-columbia',
    cityId: 'bowling-green',
    title: 'Columbia',
    description: 'WBKO regional weather camera in Columbia.',
    latitude: 37.1028,
    longitude: -85.3064,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Columbia_Thumb.jpg',
  },
  {
    id: 'bg-wbko-edmonton',
    cityId: 'bowling-green',
    title: 'Edmonton',
    description: 'WBKO regional weather camera in Edmonton.',
    latitude: 36.9801,
    longitude: -85.6122,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Edmonton.jpg',
  },
  {
    id: 'bg-wbko-glasgow',
    cityId: 'bowling-green',
    title: 'Glasgow',
    description: 'WBKO regional weather camera in Glasgow.',
    latitude: 36.9959,
    longitude: -85.9119,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Glasgow.jpg',
  },
  {
    id: 'bg-wbko-leitchfield',
    cityId: 'bowling-green',
    title: 'Leitchfield',
    description: 'WBKO regional weather camera in Leitchfield.',
    latitude: 37.4801,
    longitude: -86.2939,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Leitchfield.jpg',
  },
  {
    id: 'bg-wbko-munfordville',
    cityId: 'bowling-green',
    title: 'Munfordville',
    description: 'WBKO regional weather camera in Munfordville.',
    latitude: 37.2723,
    longitude: -85.8911,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Munfordville.jpg',
  },
  {
    id: 'bg-wbko-russellville',
    cityId: 'bowling-green',
    title: 'Russellville',
    description: 'WBKO regional weather camera in Russellville.',
    latitude: 36.8453,
    longitude: -86.8872,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Russville.jpg',
  },
  {
    id: 'bg-wbko-scottsville',
    cityId: 'bowling-green',
    title: 'Scottsville',
    description: 'WBKO regional weather camera in Scottsville.',
    latitude: 36.7534,
    longitude: -86.1905,
    source: 'WBKO weather cameras',
    mediaUrl: 'https://webpubcontent.gray.tv/wbko/Weather/Scottsville.jpg',
  },
  {
    id: 'bg-wku-fieldhouse',
    cityId: 'bowling-green',
    title: 'WKU Hilltopper Fieldhouse',
    description: 'Western Kentucky University campus construction camera, updated during daylight hours.',
    latitude: 36.9858,
    longitude: -86.456,
    source: 'Western Kentucky University',
    mediaUrl: 'https://webapps.wku.edu/webcams/axisfield/hugesize.jpg',
  },
  {
    id: 'bg-wku-pressbox',
    cityId: 'bowling-green',
    title: 'WKU Smith West Pressbox',
    description: 'Western Kentucky University campus construction camera, updated during daylight hours.',
    latitude: 36.9848,
    longitude: -86.4588,
    source: 'Western Kentucky University',
    mediaUrl: 'https://webapps.wku.edu/webcams/axispress/hugesize.jpg',
  },
];

const cityCache = new Map<CityId, { at: number; events: CityEvent[] }>();
const CITY_CACHE_MS = 2 * 60 * 1000;

function baseEvent(cam: KnownLiveCam): Omit<CityEvent, 'embedUrl' | 'streamUrl' | 'mediaUrl'> {
  return {
    id: cam.id,
    category: 'camera',
    severity: 'info',
    title: cam.title,
    description: cam.description,
    latitude: cam.latitude,
    longitude: cam.longitude,
    timestamp: null,
    source: cam.source,
  };
}

function titleMatchesCam(cam: KnownLiveCam, liveTitle?: string): boolean {
  const haystack = `${liveTitle ?? ''} ${cam.title}`.toLowerCase();
  if (cam.id.includes('broadway')) return haystack.includes('broadway');
  if (cam.id.includes('sunset')) return haystack.includes('sunset') || haystack.includes('horizon');
  if (cam.id.includes('ohio')) return haystack.includes('jeffersonville') || haystack.includes('ohio');
  if (cam.id.includes('lagrange')) return haystack.includes('la grange') || haystack.includes('lagrange');
  if (cam.id.includes('new-albany')) return haystack.includes('new albany');
  return true;
}

async function resolveYouTubeCam(cam: KnownLiveCam): Promise<CityEvent | null> {
  if (!cam.videoId) return null;
  const inspected = await inspectYouTubeVideo(cam.videoId);
  let videoId = cam.videoId;
  if (!inspected?.isLive && cam.handle) {
    const live = await resolveYouTubeLiveHandle(cam.handle);
    if (live?.isLive && live.embeddable && titleMatchesCam(cam, live.title)) {
      videoId = live.videoId;
    }
  }
  return {
    ...baseEvent(cam),
    mediaUrl: youtubeThumbUrl(videoId),
    embedUrl: youtubeEmbedUrl(videoId),
  };
}

async function resolveWetmetCam(cam: KnownLiveCam): Promise<CityEvent | null> {
  if (!cam.wetmetUid) return null;
  const stream = await resolveWetmet(cam.wetmetUid);
  return {
    ...baseEvent(cam),
    mediaUrl: stream.thumb,
    streamUrl: stream.hls,
    embedUrl: stream.hls ? undefined : wetmetEmbedUrl(cam.wetmetUid),
  };
}

function resolveEarthCam(cam: KnownLiveCam): CityEvent | null {
  if (!cam.earthCamUrl) return null;
  const streamUrl = earthCamProxyUrl(cam.earthCamUrl);
  if (!streamUrl) return null;
  return {
    ...baseEvent(cam),
    streamUrl,
  };
}

function resolveMediaCam(cam: KnownLiveCam): CityEvent | null {
  if (!cam.mediaUrl) return null;
  return {
    ...baseEvent(cam),
    mediaUrl: cam.mediaUrl,
  };
}

function resolveEmbedCam(cam: KnownLiveCam): CityEvent | null {
  if (!cam.embedUrl) return null;
  return {
    ...baseEvent(cam),
    embedUrl: cam.embedUrl,
  };
}

async function resolveKnownCam(cam: KnownLiveCam): Promise<CityEvent | null> {
  if (cam.earthCamUrl) return resolveEarthCam(cam);
  if (cam.wetmetUid) return resolveWetmetCam(cam);
  if (cam.videoId) return resolveYouTubeCam(cam);
  if (cam.mediaUrl) return resolveMediaCam(cam);
  if (cam.embedUrl) return resolveEmbedCam(cam);
  return null;
}

export async function getCityLiveCams(city: CityConfig): Promise<CityEvent[]> {
  const cached = cityCache.get(city.id);
  if (cached && Date.now() - cached.at < CITY_CACHE_MS) {
    return cached.events;
  }

  const known = KNOWN_LIVE_CAMS.filter((cam) => cam.cityId === city.id);
  const resolved = await Promise.all(known.map(resolveKnownCam));
  const events = resolved.filter(
    (event): event is CityEvent => Boolean(event?.mediaUrl || event?.streamUrl || event?.embedUrl),
  );
  cityCache.set(city.id, { at: Date.now(), events });
  return events;
}
