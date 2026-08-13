import React, { useState } from 'react';
import { Image } from 'expo-image';

const BY_KEY = {
  attractions: require('../../assets/events/Attractions.png'),
  baseball: require('../../assets/events/Baseball.png'),
  boxing: require('../../assets/events/Boxing.png'),
  campaign: require('../../assets/events/Campaign.png'),
  concert: require('../../assets/events/Concert.png'),
  default: require('../../assets/events/Default.png'),
  event: require('../../assets/events/Event.png'),
  exhibition: require('../../assets/events/Exhibition.png'),
  heroshow: require('../../assets/events/HeroShow.png'),
  jobfair: require('../../assets/events/JobFair.png'),
  martialarts: require('../../assets/events/MartialArts.png'),
  musical: require('../../assets/events/Musical.png'),
  other: require('../../assets/events/Other.png'),
  prowrestling: require('../../assets/events/ProWrestling.png'),
  spalaqua: require('../../assets/events/SpaLaQua.png'),
  sports: require('../../assets/events/Sports.png'),
  stage: require('../../assets/events/Stage.png'),
  tokyodomecity: require('../../assets/events/TokyoDomeCity.png'),
};

const CATEGORY_ALIAS = {
  'art project': 'exhibition',
  attractions: 'attractions',
  baseball: 'baseball',
  boxing: 'boxing',
  campaign: 'campaign',
  concert: 'concert',
  'course / lecture': 'event',
  event: 'event',
  exhibition: 'exhibition',
  'hero show': 'heroshow',
  'job fair': 'jobfair',
  'laqua garden stage': 'stage',
  'martial arts': 'martialarts',
  musical: 'musical',
  other: 'other',
  'pro-wrestling': 'prowrestling',
  'spa laqua': 'spalaqua',
  'special event': 'event',
  sports: 'sports',
  stage: 'stage',
  'tenq space store': 'attractions',
  'tokyo dome city': 'tokyodomecity',
  eat: 'tokyodomecity',
  food: 'tokyodomecity',
  play: 'attractions',
  sport: 'baseball',
  thrill: 'attractions',
  spa: 'spalaqua',
  relax: 'spalaqua',
  culture: 'exhibition',
  family: 'attractions',
  amenity: 'tokyodomecity',
};

export function fallbackCoverForEvent(event) {
  const cat = String(event?.category || '').trim().toLowerCase();
  const key = CATEGORY_ALIAS[cat];
  if (key && BY_KEY[key]) return BY_KEY[key];

  const place = String(event?.placeName || '').toLowerCase();
  if (/laqua|spa/.test(place)) return BY_KEY.spalaqua;
  if (/korakuen/.test(place)) return BY_KEY.prowrestling;
  if (/tokyo dome/.test(place)) return BY_KEY.tokyodomecity;
  return BY_KEY.default;
}

export function EventCoverImage({ event, style }) {
  const fallback = fallbackCoverForEvent(event);
  const remote = event?.thumbnail ? String(event.thumbnail) : '';
  const [failed, setFailed] = useState(false);
  const source = remote && !failed ? { uri: remote } : fallback;

  return (
    <Image
      source={source}
      style={style}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  );
}
