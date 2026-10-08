// Exact independently downloaded original card artwork.
export const POPULAR_GOD_REFERENCE_ART = Object.freeze(Object.fromEntries(
  Object.entries({
  "10000020": {
    "cardId": "10000020",
    "full": {
      "assetPath": "/cards/reference/10000020.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards/10000020.jpg",
      "width": 813,
      "height": 1185,
      "bytes": 184647,
      "sha256": "f9854648af7a114c566ab263b89fe059fc1d1c49e2c2283c3f9c9bb3947e13ed"
    },
    "cropped": {
      "assetPath": "/cards/cropped/10000020.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_cropped/10000020.jpg",
      "width": 624,
      "height": 624,
      "bytes": 152008,
      "sha256": "b5fa4c8979ee56b94fa7ae4e1052ee20af3917e665dd0dfaf4b25d8320060cf6"
    },
    "small": {
      "assetPath": "/cards/small/10000020.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_small/10000020.jpg",
      "width": 268,
      "height": 391,
      "bytes": 29445,
      "sha256": "98f1d3245c76325f94066c35842e8bd0ab71192a7c66febe8c1e53e2933a8de5"
    }
  },
  "10000000": {
    "cardId": "10000000",
    "full": {
      "assetPath": "/cards/reference/10000000.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards/10000000.jpg",
      "width": 813,
      "height": 1185,
      "bytes": 179154,
      "sha256": "7eeff78a2e8e8631908f6cba2a8f6a3dba88b375546154fc7ef7730dfdf10e9e"
    },
    "cropped": {
      "assetPath": "/cards/cropped/10000000.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_cropped/10000000.jpg",
      "width": 624,
      "height": 624,
      "bytes": 134634,
      "sha256": "8982f5f5d38bae8e743f015286247d68f03ea8140ffe9d1589cfe9f947a50efc"
    },
    "small": {
      "assetPath": "/cards/small/10000000.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_small/10000000.jpg",
      "width": 268,
      "height": 391,
      "bytes": 29023,
      "sha256": "2ecae80669c100339595c55146a1ae8937848578ede90508b2842f566fd117af"
    }
  },
  "10000010": {
    "cardId": "10000010",
    "full": {
      "assetPath": "/cards/reference/10000010.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards/10000010.jpg",
      "width": 813,
      "height": 1185,
      "bytes": 187717,
      "sha256": "e36f01a9ab25cd4ebf1b4efeaeb08d89d4886fa98649e8cc2cfa2ae5cf24a993"
    },
    "cropped": {
      "assetPath": "/cards/cropped/10000010.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_cropped/10000010.jpg",
      "width": 624,
      "height": 624,
      "bytes": 145377,
      "sha256": "fc7e54ffd8d56d493f039e93e8e9d2a94d09f0f3154340fac42110c274e1a64e"
    },
    "small": {
      "assetPath": "/cards/small/10000010.jpg",
      "sourceUrl": "https://images.ygoprodeck.com/images/cards_small/10000010.jpg",
      "width": 268,
      "height": 391,
      "bytes": 29601,
      "sha256": "888e8ed8457177b097815eec26408657f76c266e79c2b015ad0ba50dceeab034"
    }
  }
}).map(([id, entry]) => [id, Object.freeze({ ...entry, full: Object.freeze(entry.full), cropped: Object.freeze(entry.cropped), small: Object.freeze(entry.small) })])
));
