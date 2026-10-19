// What the sample posts draw on each photo, and the little stories they tell about it. Each scene matches one
// photo in data/seedPhotos.ts (same order): its doodles sit on the things in the picture (birds on the branch,
// a crown on the gull, a face on the iced coffee), and its captions imagine what those things are up to.
// Coordinates are photo-relative (0..1); a little past the edges is the doodle margin around the photo.
import { C, type Kit } from './doodleKit';

export type Scene = { draw: (k: Kit) => void; captions: string[] };

export const SEED_SCENES: Scene[] = [
  // p01: pink clouds resting on the North Shore mountains over the harbour
  {
    draw: (k) => {
      k.face(0.5, 0.42, 0.11, C.white, 'sleepy', C.pink);
      k.zzz(0.66, 0.29, 0.06, C.white);
      k.face(0.8, 0.74, 0.06, C.yellow, 'calm');
      k.flyingBird(0.18, 0.14, 0.035, C.white);
      k.flyingBird(0.3, 0.09, 0.03, C.white);
    },
    captions: [
      "The clouds came down to nap on the mountains again. The whole city kept its lights low so it wouldn't wake them.",
      'Every evening the mountains pull the clouds over like a blanket. Tonight they forgot to tuck in the left side.',
    ],
  },
  // p02: the sun at the top, its glitter path down the water, a pier and ships on the horizon
  {
    draw: (k) => {
      k.sun(0.47, 0.06, 0.09, C.yellow, 'joy');
      k.fish(0.27, 0.74, 0.07, C.white);
      k.motion(0.15, 0.76, 0.04, C.white, 0);
      k.fish(0.72, 0.84, 0.06, C.white, true);
      k.sparkle(0.6, 0.62, 0.05, C.yellow);
      k.sparkle(0.38, 0.9, 0.04, C.yellow);
    },
    captions: [
      'The sun rolled out a glitter road across the water, and two little fish are racing down it to see where it goes.',
      'Somebody up there spilled a whole jar of sparkles and the sea has been picking them up all afternoon.',
    ],
  },
  // p03: a card with dried flowers in a drawn bottle, "especially for you"
  {
    draw: (k) => {
      k.face(0.55, 0.76, 0.1, C.pink, 'happy', C.orange);
      k.heart(0.32, 0.06, 0.05, C.pink);
      k.heart(0.47, -0.03, 0.04, C.orange);
      k.heart(0.6, 0.06, 0.035, C.pink);
      k.butterfly(0.85, 0.14, 0.07, C.blue);
      k.trail(
        [
          [0.7, 0.3],
          [0.78, 0.25],
          [0.83, 0.2],
        ],
        C.blue,
      );
    },
    captions: [
      "The little drawn vase was so proud to finally hold real flowers. It hasn't stopped smiling since Tuesday.",
      'Someone wrote "especially for you" and the flowers took it very, very seriously.',
    ],
  },
  // p04: dried lavender on the left, a red anthurium on the right, a candle jar on the shelf, low sun
  {
    draw: (k) => {
      k.bee(0.58, 0.4, 0.06, C.yellow);
      k.trail(
        [
          [0.2, 0.35],
          [0.32, 0.22],
          [0.42, 0.32],
          [0.5, 0.42],
        ],
        C.yellow,
      );
      k.heart(0.74, 0.4, 0.04, C.pink);
      k.face(0.79, 0.24, 0.045, C.white, 'sleepy');
      k.glow(0.02, 0.02, 0.2, C.yellow, 4, 10, 80);
    },
    captions: [
      'The bee did a full lap of the lavender before deciding the red flower had better gossip.',
      'Afternoon light came in sideways and every plant on the sill stretched toward it like a cat. The candle slept through it.',
    ],
  },
  // p05: an orange sunset sky over layered mountain ridges
  {
    draw: (k) => {
      k.face(0.72, 0.56, 0.08, C.white, 'sleepy');
      k.zzz(0.83, 0.44, 0.05, C.white);
      k.flyingBird(0.22, 0.22, 0.035, C.white);
      k.flyingBird(0.32, 0.17, 0.03, C.white);
      k.flyingBird(0.15, 0.15, 0.025, C.white);
      k.star(0.55, 0.08, 0.05, C.yellow);
    },
    captions: [
      'Three birds racing home before the sky switches off. The big hill is already pretending to be asleep.',
      'The sun slid behind the ridge and told the mountains goodnight. The first star is stretching, about to start its shift.',
    ],
  },
  // p06: one lone bird crossing an orange sky
  {
    draw: (k) => {
      k.flyingBird(0.64, 0.38, 0.04, C.white, true);
      k.heart(0.57, 0.33, 0.035, C.pink);
      k.trail(
        [
          [0.2, 0.6],
          [0.32, 0.55],
          [0.44, 0.49],
        ],
        C.white,
      );
      k.trail(
        [
          [0.92, 0.25],
          [0.82, 0.3],
          [0.7, 0.36],
        ],
        C.white,
      );
      k.bubble(0.36, 0.33, 0.08, C.white, '!');
    },
    captions: [
      "This bird was flying home alone until it spotted a friend headed the same way. They're splitting the sky fifty-fifty.",
      'One bird, the whole orange sky to itself, and it still waved at someone it knew.',
    ],
  },
  // p07: a cargo ship anchored under a pink dusk, mountains behind
  {
    draw: (k) => {
      k.face(0.45, 0.64, 0.06, C.white, 'sleepy');
      k.puffs(0.5, 0.52, 0.05, C.white);
      k.moon(0.82, 0.14, 0.07, C.yellow);
      k.star(0.2, 0.12, 0.04, C.yellow);
      k.star(0.33, 0.25, 0.03, C.yellow);
      k.waves(0.25, 0.68, 0.74, C.white);
    },
    captions: [
      'The big ship parked for the night and puffed out its last little clouds. The moon came early to keep it company.',
      'Even cargo ships get sleepy. This one is counting waves instead of sheep.',
    ],
  },
  // p08: two iced matchas on a ledge, posing for a phone
  {
    draw: (k) => {
      k.face(0.25, 0.555, 0.04, C.white, 'joy', C.pink);
      k.face(0.4, 0.555, 0.04, C.white, 'wink', C.pink);
      k.sparkle(0.18, 0.4, 0.05, C.yellow);
      k.glow(0.55, 0.42, 0.12, C.yellow, 4, 150, 230);
      k.bubble(0.18, 0.28, 0.08, C.white, 'heart');
    },
    captions: [
      'The two matchas heard the camera and immediately struck their best pose. The one on the right is definitely the diva.',
      'Photoshoot for two very famous drinks. They insisted on the hedge as their backdrop.',
    ],
  },
  // p09: a bus stop sign tucked in leaves
  {
    draw: (k) => {
      k.bird(0.36, 0.11, 0.05, C.orange);
      k.bubble(0.66, 0.02, 0.06, C.yellow, 'note', true);
      k.note(0.12, 0.6, 0.06, C.white);
    },
    captions: [
      "This little bird has been at the stop all morning. It doesn't need the bus. It just likes telling everyone when it's coming.",
      'The leaves keep trying to hide the bus sign. The birds keep telling everyone where it is.',
    ],
  },
  // p10: downtown at dusk, a street lamp at the top left, a red light below
  {
    draw: (k) => {
      k.face(0.28, 0.12, 0.05, C.yellow, 'sleepy');
      k.glow(0.28, 0.1, 0.09, C.yellow, 5, 200, 340);
      k.face(0.36, 0.6, 0.045, C.white, 'wow');
      k.moon(0.7, 0.12, 0.06, C.white);
      k.star(0.62, 0.25, 0.035, C.yellow);
    },
    captions: [
      'The street lamp just woke up for its night shift and is still rubbing its eyes. The red light is already being bossy.',
      'Downtown at the exact minute the sky turns peach. Everybody stopped at the light just to look up.',
    ],
  },
  // p11: golden crumpled clouds above calm water
  {
    draw: (k) => {
      k.sun(0.5, 0.48, 0.09, C.yellow, 'wink');
      k.flyingBird(0.25, 0.3, 0.035, C.white);
      k.flyingBird(0.36, 0.25, 0.03, C.white);
      k.fish(0.72, 0.8, 0.065, C.white);
      k.drop(0.64, 0.76, 0.03, C.white);
      k.drop(0.8, 0.74, 0.025, C.white);
    },
    captions: [
      'The sun is hiding behind the clouds, peeking out just enough to paint them gold. A fish jumped up to check on it.',
      'Clouds like crumpled honey paper, and two gulls arguing about who saw it first.',
    ],
  },
  // p12: two dogs on a big lawn, trees and a mountain behind
  {
    draw: (k) => {
      k.heart(0.24, 0.6, 0.04, C.pink);
      k.bubble(0.42, 0.55, 0.07, C.white, '?');
      k.ball(0.6, 0.75, 0.04, C.yellow);
      k.trail(
        [
          [0.38, 0.72],
          [0.48, 0.66],
          [0.56, 0.72],
        ],
        C.yellow,
      );
      k.motion(0.07, 0.77, 0.05, C.white, 0);
      k.flyingBird(0.5, 0.08, 0.03, C.white);
    },
    captions: [
      "Two dogs, one ball, zero plans. The fluffy one keeps pretending it didn't see where it went.",
      "The mountain watched these two run laps for an hour. It's a little bit jealous.",
    ],
  },
  // p13: a rail yard full of containers under the city
  {
    draw: (k) => {
      k.face(0.3, 0.72, 0.06, C.orange, 'joy');
      k.face(0.75, 0.73, 0.05, C.white, 'sleepy');
      k.cloud(0.6, 0.18, 0.08, C.white);
      k.face(0.6, 0.2, 0.05, C.white, 'calm');
      k.flyingBird(0.2, 0.15, 0.03, C.white);
    },
    captions: [
      "The containers are lined up like kids waiting for the school bus. The white one up front can't wait to go.",
      "The rail yard is quiet, but the containers are whispering about where they'll all be tomorrow.",
    ],
  },
  // p14: looking straight up between towers, a street lamp
  {
    draw: (k) => {
      k.paperPlane(0.5, 0.18, 0.08, C.white);
      k.trail(
        [
          [0.15, 0.32],
          [0.25, 0.2],
          [0.36, 0.26],
          [0.44, 0.2],
        ],
        C.white,
      );
      k.face(0.78, 0.38, 0.07, C.white, 'wow');
      k.face(0.32, 0.56, 0.04, C.yellow, 'happy');
    },
    captions: [
      'The towers lean in so close they can whisper over the street. Someone threw a paper plane right through their chat.',
      "From down here the buildings look like they're bending over to see who's walking by.",
    ],
  },
  // p15: a signpost pointing every direction against a deep blue sky
  {
    draw: (k) => {
      k.bird(0.84, 0.36, 0.05, C.yellow, true);
      k.question(0.55, 0.18, 0.08, C.white);
      k.question(0.7, 0.12, 0.05, C.white);
      k.face(0.32, 0.6, 0.05, C.white, 'wow');
      k.sun(0.15, 0.12, 0.06, C.yellow);
    },
    captions: [
      'Every arm points somewhere different and the signpost just shrugs. The bird on top already picked a direction.',
      "Lost? So is the signpost. It's been arguing with itself since noon.",
    ],
  },
  // p16: a forest trail between tall cedars
  {
    draw: (k) => {
      k.branch(0.06, 0.38, 0.38, 0.345, C.orange);
      k.bird(0.14, 0.37, 0.04, C.yellow);
      k.bird(0.31, 0.35, 0.04, C.orange, true);
      k.paws(
        [
          [0.55, 0.93],
          [0.5, 0.84],
          [0.53, 0.76],
        ],
        0.03,
        C.white,
      );
      k.sun(0.52, 0.05, 0.06, C.yellow, 'happy');
    },
    captions: [
      'Two birds on a branch, giving directions to everyone on the trail. Mostly they just say "keep going."',
      'The trees here are so tall they talk to the clouds. Down on the path, the birds handle the small talk.',
    ],
  },
  // p17: ferns and a thin stick in dappled light
  {
    draw: (k) => {
      k.caterpillar(0.22, 0.32, 0.05, C.yellow);
      k.butterfly(0.72, 0.18, 0.07, C.pink);
      k.bubble(0.45, 0.18, 0.06, C.white, 'dots', true);
    },
    captions: [
      "A caterpillar is climbing the fern like it's a mountain. The butterfly up top keeps promising it gets easier.",
      'Down here every leaf is a whole neighborhood, and the caterpillar knows everyone.',
    ],
  },
  // p18: huge old cedar trunks
  {
    draw: (k) => {
      k.face(0.27, 0.45, 0.1, C.white, 'calm');
      k.mushroom(0.12, 0.88, 0.06, C.orange);
      k.mushroom(0.2, 0.9, 0.045, C.orange);
      k.zzz(0.28, 0.78, 0.04, C.white);
      k.branch(0.55, 0.12, 0.75, 0.1, C.yellow);
      k.bird(0.65, 0.105, 0.04, C.yellow);
    },
    captions: [
      "This tree is about five hundred years old and has heard every secret in the forest. It hasn't told anyone. Yet.",
      'The old giant stood very still so the mushrooms at its feet could finish their nap.',
    ],
  },
  // p19: conifer tops against a pale blue sky
  {
    draw: (k) => {
      k.bird(0.72, 0.08, 0.035, C.orange);
      k.bird(0.86, 0.08, 0.035, C.yellow, true);
      k.cloud(0.42, 0.16, 0.08, C.white);
      k.face(0.42, 0.18, 0.05, C.white, 'happy');
      k.flyingBird(0.2, 0.3, 0.03, C.white);
    },
    captions: [
      'Two birds claimed the tallest treetop and refuse to share it. The cloud floated over to negotiate.',
      'The forest is holding its breath for the first warm day of spring.',
    ],
  },
  // p20: a street at sunset, a little convertible in front, a crane on the tower
  {
    draw: (k) => {
      k.sunglasses(0.3, 0.72, 0.07, C.white);
      k.motion(0.12, 0.74, 0.05, C.white, 0);
      k.sun(0.65, 0.6, 0.06, C.yellow, 'joy');
      k.bird(0.27, 0.1, 0.035, C.orange);
    },
    captions: [
      'The little convertible is racing the sun home. The sun is winning, but only barely.',
      'Rush hour, but make it golden. Even the crane stopped working to watch.',
    ],
  },
  // p21: a downtown street with the sun in the slot between towers
  {
    draw: (k) => {
      k.sun(0.25, 0.5, 0.08, C.yellow, 'joy');
      k.flyingBird(0.2, 0.25, 0.03, C.white);
      k.flyingBird(0.3, 0.2, 0.025, C.white);
      k.heart(0.6, 0.15, 0.04, C.pink);
    },
    captions: [
      'The sun squeezed between two towers for one last look at the street. Everyone below got a few extra minutes of gold.',
      'Rush hour stopped for a second when the sun lined up perfectly with the street.',
    ],
  },
  // p22: big daisies up close
  {
    draw: (k) => {
      k.face(0.22, 0.65, 0.06, C.orange, 'joy');
      k.face(0.79, 0.8, 0.05, C.orange, 'happy');
      k.face(0.45, 0.52, 0.045, C.orange, 'wow');
      k.bee(0.68, 0.25, 0.06, C.yellow, true);
      k.trail(
        [
          [0.95, 0.12],
          [0.85, 0.2],
          [0.76, 0.22],
        ],
        C.yellow,
      );
    },
    captions: [
      'The daisies were having a smiling contest until the bee showed up and everybody got shy.',
      "Every daisy here is facing the sun like it's the only thing worth looking at. Fair.",
    ],
  },
  // p23: a grey evening with sunset glow behind the mountains, a beach in front
  {
    draw: (k) => {
      k.sun(0.62, 0.52, 0.06, C.yellow, 'sleepy');
      k.crab(0.4, 0.88, 0.06, C.orange);
      k.bubble(0.55, 0.8, 0.06, C.white, 'heart', true);
      k.flyingBird(0.3, 0.3, 0.03, C.white);
    },
    captions: [
      'Grey all day, but the sun peeked out at the very end to say sorry. A crab came out to accept the apology.',
      'The clouds wanted the evening to themselves. The sun snuck in anyway, just for a minute.',
    ],
  },
  // p24: a seagull on the beach, waves behind, sun in the corner
  {
    draw: (k) => {
      k.crown(0.6, 0.51, 0.07, C.yellow);
      k.bubble(0.86, 0.45, 0.08, C.white, '!', true);
      k.sparkle(0.42, 0.58, 0.04, C.yellow);
    },
    captions: [
      'The self-declared king of the beach, inspecting his kingdom. He has a lot of opinions about your sandwich.',
      'This gull walked right up to say hi. Or to ask for fries. Hard to say.',
    ],
  },
  // p25: the sun low over the water on a beach, waves rolling in
  {
    draw: (k) => {
      k.sun(0.6, 0.38, 0.1, C.yellow, 'joy');
      k.flyingBird(0.25, 0.18, 0.035, C.white);
      k.flyingBird(0.36, 0.13, 0.03, C.white);
      k.heart(0.82, 0.25, 0.04, C.pink);
      k.waves(0.1, 0.6, 0.86, C.white);
    },
    captions: [
      'The sun stopped at the edge of the water to dip its toes in before going to bed.',
      "Low tide, long shadows, and a sun that just won't stop showing off.",
    ],
  },
  // p26: tiramisu ingredients laid out on a counter
  {
    draw: (k) => {
      k.face(0.8, 0.66, 0.06, C.orange, 'wow');
      k.face(0.5, 0.83, 0.06, C.pink, 'sleepy');
      k.zzz(0.6, 0.76, 0.035, C.pink);
      k.crown(0.62, 0.0, 0.05, C.yellow);
      k.arrow(0.3, 0.72, 0.45, 0.6, C.orange, 0.25);
    },
    captions: [
      "Team tiramisu, assembling. The eggs are nervous, the sugar is asleep, and the cocoa thinks it's the main character.",
      "Everyone's here for the big recipe. The mascarpone is trying very hard to look calm.",
    ],
  },
  // p27: a fluffy white cat walking down a hallway
  {
    draw: (k) => {
      k.crown(0.56, 0.2, 0.07, C.yellow);
      k.sparkle(0.35, 0.22, 0.04, C.yellow);
      k.sparkle(0.78, 0.3, 0.035, C.yellow);
      k.paws(
        [
          [0.7, 0.98],
          [0.63, 0.9],
          [0.7, 0.82],
        ],
        0.03,
        C.pink,
      );
      k.bubble(0.85, 0.12, 0.07, C.pink, '?', true);
    },
    captions: [
      'Her Royal Fluffiness has come to inspect the hallway. It does not meet her standards.',
      'She heard a treat bag open three rooms away. She is here now.',
    ],
  },
  // p28: a patio on a sunny street corner, power lines overhead
  {
    draw: (k) => {
      k.bird(0.68, 0.13, 0.03, C.orange);
      k.bird(0.8, 0.155, 0.03, C.yellow, true);
      k.sun(0.4, 0.08, 0.06, C.yellow, 'happy');
      k.heart(0.84, 0.62, 0.035, C.pink);
    },
    captions: [
      'Two birds on the wire are people-watching the patio. They give the orange chairs a solid ten.',
      "The kind of afternoon where even the car looks like it's on vacation.",
    ],
  },
  // p29: jellyfish drifting in deep blue
  {
    draw: (k) => {
      k.face(0.43, 0.46, 0.07, C.white, 'happy');
      k.face(0.15, 0.36, 0.05, C.white, 'calm');
      k.face(0.75, 0.82, 0.04, C.pink, 'joy');
      k.note(0.62, 0.35, 0.05, C.yellow);
      k.note(0.7, 0.28, 0.04, C.yellow);
      for (const [x, y] of [
        [0.3, 0.2],
        [0.33, 0.13],
        [0.29, 0.07],
      ] as const)
        k.puffs(x, y, 0.02, C.white, 1);
    },
    captions: [
      "The jellyfish are having a very slow dance party. The little ones at the bottom haven't learned the moves yet.",
      'No bones, no brain, no worries. Honestly, goals.',
    ],
  },
  // p30: a soft-serve cone held up in a cafe
  {
    draw: (k) => {
      k.face(0.5, 0.45, 0.08, C.pink, 'joy', C.orange);
      k.drop(0.72, 0.52, 0.035, C.blue);
      k.sparkle(0.25, 0.15, 0.05, C.yellow);
      k.heart(0.78, 0.18, 0.04, C.pink);
    },
    captions: [
      'This ice cream knows it has about four minutes left, and it has decided to be very happy about it.',
      'Twist, swirl, and a little sweat. Summer is a lot for a soft serve.',
    ],
  },
  // p31: downtown at night, a red light and wires
  {
    draw: (k) => {
      k.face(0.4, 0.7, 0.04, C.white, 'wow');
      k.moon(0.62, 0.1, 0.06, C.yellow);
      k.bird(0.3, 0.2, 0.035, C.yellow);
      k.star(0.82, 0.2, 0.035, C.yellow);
    },
    captions: [
      'The red light has been holding everyone back for ninety seconds and it is absolutely loving the power.',
      'Late night downtown. The bird on the wire is the only one not in a hurry.',
    ],
  },
  // p32: an iced coffee in a yellow cup, held up
  {
    draw: (k) => {
      k.face(0.48, 0.62, 0.08, C.white, 'joy');
      k.arms(0.48, 0.6, 0.08, 1.1, C.white, 'cheer');
      k.motion(0.85, 0.5, 0.04, C.white, 180);
      k.sparkle(0.22, 0.25, 0.04, C.yellow);
    },
    captions: [
      'This iced coffee is waving at you. It has a lot of energy and absolutely nowhere to put it.',
      'Fully caffeinated cup, cheering itself on for the day ahead.',
    ],
  },
  // p33: through a car window: fields, a mountain, clouds
  {
    draw: (k) => {
      k.face(0.32, 0.22, 0.05, C.white, 'happy');
      k.motion(0.92, 0.6, 0.06, C.white, 0);
      k.flyingBird(0.6, 0.26, 0.03, C.white);
      k.flyingBird(0.7, 0.22, 0.025, C.white);
    },
    captions: [
      'Somewhere between towns. The clouds are racing the car, and the clouds are winning.',
      'Two birds kept pace with us for a whole minute. Then they took the scenic route.',
    ],
  },
  // p34: a plush pigeon on an orange pedestal
  {
    draw: (k) => {
      k.crown(0.48, 0.08, 0.08, C.yellow);
      k.bubble(0.82, 0.18, 0.08, C.pink, 'heart', true);
      k.sparkle(0.2, 0.25, 0.04, C.yellow);
      k.sparkle(0.82, 0.55, 0.035, C.white);
    },
    captions: [
      'The most important pigeon in the city, posing on its pedestal. Please, no autographs.',
      "He's soft, he's round, and he has absolutely seen you eating lunch.",
    ],
  },
  // p35: a matcha bowl with a spoon, the whisk resting in a glass
  {
    draw: (k) => {
      k.face(0.33, 0.14, 0.05, C.white, 'sleepy');
      k.zzz(0.45, 0.05, 0.04, C.white);
      k.steam(0.5, 0.42, 0.08, C.white);
      k.face(0.48, 0.65, 0.07, C.white, 'calm');
    },
    captions: [
      'The whisk worked hard this morning and is taking a well-deserved nap. The matcha is still warm and very calm about it.',
      'Slow morning. The matcha sat still long enough to become a little green pond.',
    ],
  },
  // p36: rows of little soju glasses
  {
    draw: (k) => {
      k.face(0.22, 0.62, 0.05, C.white, 'joy', C.pink);
      k.face(0.58, 0.55, 0.05, C.white, 'wink');
      k.sparkle(0.42, 0.42, 0.04, C.yellow);
      k.note(0.82, 0.12, 0.05, C.yellow);
      k.heart(0.1, 0.2, 0.04, C.pink);
    },
    captions: [
      'The little glasses lined up for a group photo before the big cheers. One of them is already blushing.',
      'Everyone at the table got a glass, and every glass got a story.',
    ],
  },
  // p37: an iced matcha latte on the sidewalk
  {
    draw: (k) => {
      k.face(0.45, 0.72, 0.08, C.white, 'happy');
      k.sunglasses(0.45, 0.3, 0.08, C.white);
      k.sun(0.86, 0.08, 0.07, C.yellow);
      k.sparkle(0.12, 0.3, 0.04, C.yellow);
    },
    captions: [
      'Matcha latte out for a walk, soaking up the sun on the sidewalk. Very chill. Very green.',
      'Sunglasses on, ice still clinking. This drink is having a better day than all of us.',
    ],
  },
  // p38: a whole field of small daisies
  {
    draw: (k) => {
      k.butterfly(0.72, 0.22, 0.08, C.blue);
      k.trail(
        [
          [0.95, 0.4],
          [0.88, 0.32],
          [0.8, 0.28],
        ],
        C.blue,
      );
      k.face(0.62, 0.55, 0.04, C.orange, 'joy');
      k.face(0.25, 0.8, 0.04, C.orange, 'happy');
      k.question(0.6, 0.08, 0.05, C.blue);
    },
    captions: [
      'A whole crowd of daisies, and the butterfly has to pick just one to land on. Big decision.',
      'The daisies spent all spring practicing their smiles for exactly this moment.',
    ],
  },
  // p39: daisies packed shoulder to shoulder
  {
    draw: (k) => {
      k.face(0.43, 0.13, 0.04, C.orange, 'joy');
      k.face(0.72, 0.43, 0.04, C.orange, 'wow');
      k.face(0.25, 0.73, 0.04, C.orange, 'happy');
      k.bee(0.85, 0.15, 0.05, C.yellow, true);
      k.heart(0.12, 0.35, 0.035, C.pink);
    },
    captions: [
      "A daisy crowd so packed nobody can see the stage, so they're all just looking up at the sun instead.",
      'Somebody in the back said "cheese" and every daisy smiled at once.',
    ],
  },
  // p40: a campfire at night
  {
    draw: (k) => {
      k.face(0.56, 0.46, 0.06, C.orange, 'joy');
      k.star(0.45, 0.25, 0.03, C.yellow);
      k.star(0.6, 0.18, 0.025, C.orange);
      k.star(0.52, 0.1, 0.03, C.yellow);
      k.marshmallow(0.98, 0.78, 0.74, 0.46, C.orange, C.white);
      k.moon(0.15, 0.1, 0.06, C.yellow);
    },
    captions: [
      'The campfire is telling ghost stories again, and the marshmallow is hanging on every word.',
      "Sparks keep floating up to join the stars. The fire thinks they'll come back. They won't.",
    ],
  },
  // p41: cherry blossom branches against blue sky
  {
    draw: (k) => {
      k.bird(0.3, 0.26, 0.045, C.yellow);
      k.bird(0.4, 0.25, 0.045, C.orange, true);
      k.heart(0.35, 0.13, 0.03, C.white);
      k.sun(0.88, 0.08, 0.06, C.yellow, 'happy');
    },
    captions: [
      "Two birds found the best seat in the cherry tree. They're pretending they're not just here for the petals.",
      'The blossoms only stay for a week, so everyone in the tree is trying very hard to remember it.',
    ],
  },
  // p42: a white bulldog in a red harness, nose deep in the grass
  {
    draw: (k) => {
      k.caterpillar(0.25, 0.75, 0.035, C.yellow, true);
      k.exclaim(0.32, 0.6, 0.05, C.white);
      k.bubble(0.62, 0.05, 0.08, C.white, '?', true);
      k.motion(0.4, 0.78, 0.03, C.white, 180);
    },
    captions: [
      'Very serious investigation underway. Detective Bulldog has found a clue, and the clue is a caterpillar.',
      'He has smelled this exact patch of grass every day for a year. Today it smells different.',
    ],
  },
  // p43: sunset over a mountain, water, a bird standing on a rock
  {
    draw: (k) => {
      k.bubble(0.62, 0.72, 0.07, C.white, 'dots', true);
      k.flyingBird(0.35, 0.68, 0.035, C.white);
      k.trail(
        [
          [0.12, 0.76],
          [0.22, 0.71],
          [0.3, 0.69],
        ],
        C.white,
      );
      k.heart(0.55, 0.62, 0.03, C.pink);
      k.star(0.18, 0.12, 0.035, C.yellow);
    },
    captions: [
      'One bird on a rock, watching the sky go orange. Another one is flying over to share the view.',
      "The mountain turned dark, the water turned gold, and the little bird on the rock didn't want to leave.",
    ],
  },
  // p44: an orange cat getting a scratch
  {
    draw: (k) => {
      k.heart(0.55, 0.22, 0.05, C.pink);
      k.heart(0.65, 0.12, 0.035, C.pink);
      k.motion(0.85, 0.32, 0.05, C.white, 0);
      k.motion(0.45, 0.5, 0.04, C.white, 200);
      k.note(0.3, 0.25, 0.05, C.yellow);
    },
    captions: [
      'This cat agreed to exactly three pets. You are on pet number eleven. It is purring anyway.',
      'The orange one runs this street. Tolls are paid in chin scratches.',
    ],
  },
  // p45: a cosy table: candles, a cactus in a pot, flowers
  {
    draw: (k) => {
      k.glow(0.47, 0.82, 0.08, C.yellow, 5, 200, 340);
      k.glow(0.71, 0.76, 0.08, C.yellow, 5, 200, 340);
      k.face(0.6, 0.6, 0.05, C.white, 'happy');
      k.face(0.22, 0.69, 0.04, C.orange, 'sleepy');
      k.zzz(0.28, 0.58, 0.035, C.white);
    },
    captions: [
      'Cosy night in. The cactus is guarding the candles, and the little one in the corner already fell asleep.',
      "Two flames on one candle, flickering like they're having a quiet conversation.",
    ],
  },
  // p46: dinner by candlelight
  {
    draw: (k) => {
      k.glow(0.6, 0.42, 0.11, C.yellow, 6, 190, 350);
      k.face(0.4, 0.62, 0.06, C.white, 'joy');
      k.steam(0.25, 0.32, 0.07, C.white);
      k.star(0.85, 0.15, 0.04, C.yellow);
      k.heart(0.12, 0.52, 0.035, C.pink);
    },
    captions: [
      'Dinner arrived and the candle leaned in for a better look. Everyone agreed this one was fancy.',
      "The crispy one at the front knows it's the star of the table.",
    ],
  },
  // p47: Gastown at night, old lamps and string lights
  {
    draw: (k) => {
      k.face(0.27, 0.44, 0.04, C.yellow, 'calm');
      k.note(0.55, 0.3, 0.05, C.white);
      k.note(0.63, 0.22, 0.04, C.white);
      k.moon(0.85, 0.08, 0.06, C.yellow);
      k.star(0.12, 0.1, 0.03, C.yellow);
    },
    captions: [
      'Gastown after dark. The old lamps hum the same tune every night, and the trees join in with their lights.',
      'Cobblestones, puddles and a street musician somewhere. The lamps know all the words.',
    ],
  },
  // p48: a Monopoly board mid-game
  {
    draw: (k) => {
      k.topHat(0.45, 0.37, 0.07, C.orange);
      k.face(0.45, 0.42, 0.04, C.orange, 'wow');
      k.drop(0.55, 0.37, 0.025, C.blue);
      k.exclaim(0.82, 0.48, 0.05, C.pink);
    },
    captions: [
      'Game night, round three. Somebody just landed on income tax and the little top hat is NOT okay.',
      'Nobody has spoken in ten minutes. The board knows exactly who is going to flip it.',
    ],
  },
  // p49: a potted plant, a tall bottle and a mimosa candle on a tray
  {
    draw: (k) => {
      k.face(0.25, 0.68, 0.05, C.orange, 'happy');
      k.face(0.6, 0.62, 0.045, C.orange, 'calm');
      k.heart(0.43, 0.55, 0.03, C.pink);
      k.face(0.62, 0.25, 0.04, C.orange, 'wow');
    },
    captions: [
      'The plant and the candle share a tray and have become best friends. The bottle in the back is a little jealous.',
      'Every morning the plant leans a bit closer to the candle. Nobody says anything.',
    ],
  },
];
