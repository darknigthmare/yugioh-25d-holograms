// Exact downloaded source JPEGs; runtime names and types never select another illustration.
const references = {
  "26905245": {
    "cardId": "26905245",
    "full": {
      "assetPath": "/cards/reference/26905245.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards/26905245.jpg",
      "width": 813,
      "height": 1185,
      "bytes": 171127,
      "sha256": "9377a21d60345e052e0564bc38910199f6593c7247791a7805a0ee23e97597bd"
    },
    "cropped": {
      "assetPath": "/cards/cropped/26905245.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_cropped/26905245.jpg",
      "width": 624,
      "height": 624,
      "bytes": 165498,
      "sha256": "da4105f998aea65251d2c1f0e3c92ae1802012ddfdb482b997fdbda59846aa60"
    },
    "small": {
      "assetPath": "/cards/small/26905245.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_small/26905245.jpg",
      "width": 268,
      "height": 391,
      "bytes": 30149,
      "sha256": "4759e30156b2cd9063d64a9395071d68d75932bccd7fec80f630ef0d4f7152ee"
    }
  },
  "28649820": {
    "cardId": "28649820",
    "full": {
      "assetPath": "/cards/reference/28649820.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards/28649820.jpg",
      "width": 813,
      "height": 1185,
      "bytes": 158154,
      "sha256": "d4bf7c195cd988b1796f07dddc2ad0f7781e4f5bff20731a8ec33884132686b8"
    },
    "cropped": {
      "assetPath": "/cards/cropped/28649820.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_cropped/28649820.jpg",
      "width": 624,
      "height": 624,
      "bytes": 141263,
      "sha256": "eaaeb38bcd2dfa389d96e5769fb978e8ebf04b9ce2d79b5a6dd67ce094797895"
    },
    "small": {
      "assetPath": "/cards/small/28649820.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_small/28649820.jpg",
      "width": 268,
      "height": 391,
      "bytes": 28004,
      "sha256": "e0408c5845482d05e88bff2873cfe30ce635ee466598f801e4fed81be64f0fa1"
    }
  }
};
for (const entry of Object.values(references)) { Object.freeze(entry.full); Object.freeze(entry.cropped); Object.freeze(entry.small); Object.freeze(entry); }
export const NATIVE_CARD_REFERENCE_ART = Object.freeze(references);
export function getNativeCardReferenceArt(code) { return NATIVE_CARD_REFERENCE_ART[String(code).replace(/^0+(?=\d)/, "")] ?? null; }
