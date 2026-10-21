// The doodles for kinds of places (scripts/store-icons.mjs → assets/stores), and which one each place on the map
// gets, from its Mapbox "maki" icon name (docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/#poi_label).

const img = (image: number) => ({ image, scale: 3 });
export const STORE_IMAGES = {
  'store-coffee': img(require('@/assets/stores/coffee.png')),
  'store-restaurant': img(require('@/assets/stores/restaurant.png')),
  'store-fastfood': img(require('@/assets/stores/fastfood.png')),
  'store-bar': img(require('@/assets/stores/bar.png')),
  'store-bakery': img(require('@/assets/stores/bakery.png')),
  'store-icecream': img(require('@/assets/stores/icecream.png')),
  'store-grocery': img(require('@/assets/stores/grocery.png')),
  'store-shop': img(require('@/assets/stores/shop.png')),
  'store-health': img(require('@/assets/stores/health.png')),
  'store-school': img(require('@/assets/stores/school.png')),
  'store-bank': img(require('@/assets/stores/bank.png')),
  'store-lodging': img(require('@/assets/stores/lodging.png')),
  'store-museum': img(require('@/assets/stores/museum.png')),
  'store-cinema': img(require('@/assets/stores/cinema.png')),
  'store-worship': img(require('@/assets/stores/worship.png')),
  'store-gym': img(require('@/assets/stores/gym.png')),
  'store-fuel': img(require('@/assets/stores/fuel.png')),
  'store-star': img(require('@/assets/stores/star.png')),
  'store-post': img(require('@/assets/stores/post.png')),
  'store-books': img(require('@/assets/stores/books.png')),
  'store-place': img(require('@/assets/stores/place.png')),
};

type StoreIcon = keyof typeof STORE_IMAGES;

const BY_MAKI: [StoreIcon, string[]][] = [
  ['store-coffee', ['cafe']],
  ['store-restaurant', ['restaurant', 'restaurant-noodle', 'restaurant-pizza', 'restaurant-seafood', 'restaurant-bbq', 'bbq']],
  ['store-fastfood', ['fast-food']],
  ['store-bar', ['bar', 'beer', 'alcohol-shop', 'nightclub']],
  ['store-bakery', ['bakery', 'confectionery']],
  ['store-icecream', ['ice-cream']],
  ['store-grocery', ['grocery', 'convenience', 'farm']],
  ['store-shop', ['shop', 'clothing-store', 'shoe', 'jewelry-store', 'gift', 'mobile-phone', 'furniture', 'hardware', 'florist', 'music', 'watch', 'optician', 'laundry', 'hairdresser', 'car', 'bicycle', 'teahouse']],
  ['store-health', ['pharmacy', 'hospital', 'doctor', 'dentist', 'veterinary']],
  ['store-school', ['school', 'college']],
  ['store-books', ['library']],
  ['store-bank', ['bank']],
  ['store-lodging', ['lodging']],
  ['store-museum', ['museum', 'art-gallery', 'monument', 'castle', 'landmark', 'town-hall']],
  ['store-cinema', ['cinema', 'theatre']],
  ['store-worship', ['place-of-worship', 'religious-christian', 'religious-jewish', 'religious-muslim', 'religious-buddhist', 'religious-shinto']],
  ['store-gym', ['fitness-centre', 'pitch', 'swimming', 'golf', 'tennis', 'basketball', 'soccer', 'american-football', 'baseball']],
  ['store-fuel', ['fuel', 'charging-station']],
  ['store-star', ['attraction', 'zoo', 'aquarium', 'amusement-park', 'stadium', 'viewpoint']],
  ['store-post', ['post']],
];

/** Places that aren't worth a doodle on this map (they'd crowd it). */
export const SKIPPED_MAKI = ['parking', 'parking-garage', 'toilet', 'entrance', 'information', 'car-rental', 'bus', 'rail', 'rail-metro', 'rail-light', 'ferry', 'airport', 'airfield', 'heliport', 'harbor', 'marker', 'dog-park', 'playground', 'picnic-site', 'cemetery', 'park', 'garden', 'drinking-water', 'waste-basket', 'recycling', 'car-repair', 'emergency-phone', 'fire-station', 'police', 'prison', 'industry', 'communications-tower'];

/** The doodle for a place: by its maki; any other shop gets the bag, anything else a small dot. */
export const STORE_ICON_EXPRESSION = [
  'match',
  ['get', 'maki'],
  ...BY_MAKI.flatMap(([icon, maki]) => [maki, icon]),
  ['match', ['get', 'class'], ['store_like', 'shop'], 'store-shop', 'store-place'],
];
