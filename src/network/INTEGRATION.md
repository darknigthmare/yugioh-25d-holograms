# Intégration du multijoueur WebRTC manuel

Ce dossier fournit une couche réseau autonome. Aucun fichier du moteur actuel
n’est modifié automatiquement. La signalisation se fait par deux codes à
copier/coller ; le duel transite ensuite dans un `RTCDataChannel` fiable et
ordonné.

## Flux de connexion

### Hôte

```js
import {
  computeDeckHash,
  DuelNetworkSession,
  ManualWebRTCTransport
} from './src/network/index.js';

const deckHash = await computeDeckHash({
  main: playerMainIds,
  extra: playerExtraIds,
  side: []
});

const transport = new ManualWebRTCTransport({
  // Sans serveur ICE, la connexion directe fonctionne surtout sur un LAN.
  // Ajouter ici un STUN/TURN administré pour Internet.
  rtcConfiguration: { iceServers: [] }
});

const network = new DuelNetworkSession({
  transport,
  role: 'host',
  appVersion: '1.1.0',
  rulesVersion: 'tcg-eu-2026-05-18-local-v1',
  rulesMode: selectedGameMode,
  deckHash,
  actionValidator: validateRemoteAction,
  actionHandler: applyRemoteAction,
  snapshotProvider: buildSafeNetworkSnapshot
}).start();

const offerCode = await transport.createOfferCode();
// Afficher offerCode avec un bouton Copier.

// Après collage du code Réponse reçu de l’invité :
await transport.acceptAnswerCode(answerCode);
```

### Invité

```js
const transport = new ManualWebRTCTransport();
const answerCode = await transport.acceptOfferCode(offerCode);
// À ce stade transport.sessionId vient de l’offre.

const network = new DuelNetworkSession({
  transport,
  role: 'guest',
  appVersion: '1.1.0',
  rulesVersion: 'tcg-eu-2026-05-18-local-v1',
  rulesMode: selectedGameMode,
  deckHash: await computeDeckHash({
    main: playerMainIds,
    extra: playerExtraIds,
    side: []
  }),
  actionValidator: validateRemoteAction,
  actionHandler: applyRemoteAction,
  applySnapshot: restoreSafeNetworkSnapshot
}).start();

// Afficher answerCode avec un bouton Copier.
```

L’évènement `ready` confirme que version de l’application, version des règles,
mode strict/sandbox et métadonnées de Deck ont été échangés. Le hash de Deck
distant est disponible dans `event.remote.deckHash`. `expectedRemoteDeckHash`
peut être fourni au constructeur lorsqu’un engagement préalable doit
correspondre exactement.

## API événementielle

`DuelNetworkSession.on(type, listener)` retourne une fonction de
désabonnement. Les évènements utiles à l’interface sont :

- `statechange` : changement d’état de connexion ;
- `ready` : handshake complet, avec les métadonnées du pair ;
- `action` : action distante lorsque l’option `actionHandler` n’est pas fournie ;
  le listener doit appeler une fois `event.respond(...)` ;
- `action-ack`, `action-timeout`, `revision-mismatch` ;
- `resync-request` et `resync` ;
- `sequence-gap`, `duplicate-message`, `protocol-error` ;
- `reconnecting`, `reconnect-needed`, `remote-close`, `close`.

Les méthodes principales sont `sendAction`, `requestResync`, `ping`,
`replaceTransport` et `close`. `sendAction` retourne une Promise résolue par
l’ACK ou rejetée en cas de refus/timeout. Les révisions sont vérifiées par
défaut ; `enforceRevision: false` ne doit être utilisé que si le moteur fournit
un mécanisme équivalent.

## Modifications nécessaires dans `src/game.js`

Le moteur actuel ne doit pas être synchronisé en envoyant ses objets internes.
Il faut d’abord ajouter une API d’actions déterministes et révisées :

1. Ajouter un compteur `networkRevision`, incrémenté après chaque action
   acceptée.
2. Exposer `validateNetworkAction(action, context)` sans mutation.
3. Exposer `applyNetworkAction(action, context)` qui retourne explicitement :

   ```js
   {
     accepted: true,
     revision: game.networkRevision,
     result: { /* résultat public minimal */ }
   }
   ```

4. Définir une union fermée d’actions, par exemple :

   - `NORMAL_SUMMON`, `SET_MONSTER`, `SET_SPELL_TRAP`, `ACTIVATE_CARD` ;
   - `CHANGE_POSITION`, `DECLARE_ATTACK`, `ADVANCE_PHASE`, `DISCARD` ;
   - `SELECT_TRIBUTE`, `SELECT_MATERIAL`, `SELECT_TARGET` ;
   - `ACTIVATE_EFFECT`, `CHAIN_RESPONSE`, `PASS_PRIORITY`.

5. Chaque action doit contenir des identifiants stables et son
   `baseRevision`. Ne jamais accepter un index ou `uid` sans vérifier qu’il
   appartient encore au joueur émetteur et à la bonne zone.
6. Remplacer les décisions aléatoires locales (`Math.random`) par un résultat
   produit par l’hôte, ou par un RNG déterministe dont la graine et le compteur
   sont inclus dans l’état synchronisé.
7. Fournir `buildSafeNetworkSnapshot(viewerSide)` et
   `restoreSafeNetworkSnapshot(snapshot)`. Le snapshot ne doit contenir que les
   informations visibles par ce pair. Ne pas sérialiser les callbacks, timers,
   éléments DOM ou objets `AudioContext`.
8. L’hôte doit être le coordinateur : il valide/applique l’action, incrémente
   la révision, puis renvoie l’ACK. L’invité attend l’ACK avant de muter son
   état, ou implémente un rollback optimiste explicite.

Exemple de raccordement :

```js
const network = new DuelNetworkSession({
  // ...
  actionValidator(action, meta) {
    return game.validateNetworkAction(action, {
      actor: meta.peerId,
      baseRevision: meta.baseRevision
    });
  },
  async actionHandler(action, meta) {
    return game.applyNetworkAction(action, {
      actor: meta.peerId,
      baseRevision: meta.baseRevision
    });
  },
  snapshotProvider() {
    return {
      revision: game.networkRevision,
      state: game.buildSafeNetworkSnapshot('remote')
    };
  }
});
```

## Modifications nécessaires dans `main.js` / `index.html`

1. Ajouter au démarrage les choix `Solo`, `Héberger`, `Rejoindre`.
2. Ajouter deux zones de texte : code Offre et code Réponse, avec boutons
   Copier/Coller et erreurs accessibles (`aria-live`).
3. Ne lancer le duel réseau qu’après l’évènement `ready`.
4. Afficher `connecting`, `handshaking`, `ready`, `reconnecting`, `rejected`
   et `closed`.
5. En mode réseau, remplacer les appels UI directs (`summonMonster`,
   `executeAttack`, `changePhase`, etc.) par `network.sendAction(...)`.
6. Bloquer une nouvelle action tant que l’ACK de l’action précédente n’est pas
   reçu, sauf si une vraie file déterministe est ajoutée.
7. Sur `sequence-gap`, désactiver temporairement les commandes jusqu’à
   l’évènement `resync`.
8. Appeler `network.close('page-unload')` dans `pagehide` et lors d’un retour
   volontaire au menu.

## Reconnexion

Une déconnexion ICE brève peut se réparer seule. Sinon le transport émet
`reconnect-needed`.

Sur la connexion existante :

```js
const reconnectOffer = await hostTransport.createReconnectOfferCode();
const reconnectAnswer =
  await guestTransport.acceptReconnectOfferCode(reconnectOffer);
await hostTransport.acceptReconnectAnswerCode(reconnectAnswer);
```

Si la `RTCPeerConnection` est irrécupérable, créer deux nouveaux transports
avec les mêmes `sessionId` et `peerId`, refaire une offre/réponse, puis appeler
`network.replaceTransport(newTransport)`. La session refait le handshake,
préserve ses numéros de séquence et retransmet les actions sans ACK avec le
même `actionId`.

## Limites de sécurité et d’équité

- Le pair distant est **non fiable**. La validation JSON, les limites de taille
  et les numéros de séquence protègent le parseur ; ils ne prouvent pas que le
  client exécute honnêtement les règles.
- Sans serveur autoritaire, l’hôte peut modifier l’état, choisir ses tirages ou
  falsifier un ACK. Ce mode ne convient pas au classement, aux tournois ou à
  des récompenses ayant une valeur.
- Le hash de Deck détecte une différence annoncée. Il ne prouve ni la liste
  réelle utilisée par un client modifié, ni l’ordre du Deck.
- WebRTC chiffre le transport avec DTLS, mais chaque pair voit tout ce qui lui
  est envoyé. Un snapshot ne doit jamais inclure la main adverse ni l’ordre du
  Deck adverse. L’absence de serveur autoritaire rend toutefois impossible de
  garantir à la fois secret parfait et tirages incontestables.
- Le SDP copié peut exposer des adresses réseau. Il doit être traité comme une
  donnée de session temporaire et ne pas être publié.
- Une connexion Internet entre NAT restrictifs peut nécessiter TURN. Un TURN
  est alors un service externe, même si aucune signalisation applicative n’est
  nécessaire.
- Ajouter des quotas applicatifs par type d’action reste recommandé contre le
  spam. Fermer la session après plusieurs messages invalides consécutifs.
- Toute faille XSS dans l’interface peut lire les codes, Decks et messages du
  duel ; CSP, échappement DOM et dépendances à jour restent nécessaires.
