# `OnlineDuelController` — API de branchement

Le contrôleur orchestre le transport WebRTC manuel et `DuelNetworkSession`
sans dépendre du DOM ni de `DuelGame`.

```js
import { OnlineDuelController }
  from './src/network/online-duel-controller.js';

const online = new OnlineDuelController({
  appVersion: '1.1.0',
  rulesVersion: 'tcg-eu-2026-05-18-local-v1',

  validateRemoteAction(action, meta) {
    return game.validateNetworkAction(action, {
      actorPeerId: meta.peerId,
      baseRevision: meta.baseRevision
    });
  },

  applyRemoteAction(action, meta) {
    return game.applyNetworkAction(action, {
      actorPeerId: meta.peerId,
      baseRevision: meta.baseRevision
    });
  },

  buildPublicSnapshot(context) {
    return {
      revision: game.networkRevision,
      state: game.buildSafeNetworkSnapshot({
        viewerPeerId: context.remotePeerId
      })
    };
  },

  applyPublicSnapshot(state, meta) {
    game.restoreSafeNetworkSnapshot(state, meta.revision);
  },

  callbacks: {
    onStatus: renderOnlineStatus,
    onCode: ({ kind, code }) => renderCopyableCode(kind, code),
    onReady: enableOnlineDuelControls,
    onActionRejected: showRejectedAction,
    onSnapshot: refreshOnlineBoard,
    onReconnectNeeded: showReconnectPanel,
    onRejected: showIncompatiblePeer,
    onError: showOnlineError
  }
});
```

## Contrat du constructeur

Les options obligatoires sont :

- `appVersion: string` : version du client, comparée pendant le handshake ;
- `rulesVersion: string` : version locale des règles, également comparée.

Les adaptateurs de jeu sont :

- `validateRemoteAction(action, meta, controller)` : retourne `true` ou
  `{ ok: true }` si l’action distante est légale, sinon une chaîne ou
  `{ ok: false, reason }` ;
- `applyRemoteAction(action, meta, controller)` : applique exactement une
  action validée et retourne
  `{ accepted, revision, reason?, result? }` ;
- `buildPublicSnapshot(context, controller)` : retourne un objet d’état ou
  `{ revision, state }` ;
- `applyPublicSnapshot(state, meta, controller)` : remplace l’état public reçu.

`meta` d’une action contient `actionId`, `baseRevision`, `currentRevision` et
`peerId`. `meta` d’un snapshot contient `requestId`, `revision` et `peerId`.

Les dépendances optionnelles sont :

- `rtcConfiguration` : configuration passée à `RTCPeerConnection` ;
- `transportFactory(options)` et `sessionFactory(options)` : injection pour
  tests ou transport personnalisé ;
- `sessionOptions` : timeouts, limite d’actions et options supportées par
  `DuelNetworkSession` ;
- `callbacks` : adaptateurs UI décrits plus bas.

## Héberger

```js
const offerCode = await online.host({
  rulesMode: selectedGameMode,
  deck: {
    main: playerMainIds,
    extra: playerExtraIds,
    side: []
  }
});

// Afficher offerCode, puis recevoir le code Réponse de l’autre joueur.
await online.acceptAnswer(answerCode);
```

## Rejoindre

```js
const answerCode = await online.join(offerCode, {
  rulesMode: selectedGameMode,
  deck: {
    main: playerMainIds,
    extra: playerExtraIds,
    side: []
  }
});

// Afficher answerCode pour que l’hôte appelle acceptAnswer().
```

`host()` et `join()` acceptent également `deckHash`,
`expectedRemoteDeckHash`, `peerId` et une configuration ICE spécifique.
Ils calculent le hash si `deck` est fourni. `acceptAnswer()` retourne `true`
après import valide de la réponse ; le duel ne devient utilisable qu’au statut
`ready`.

## Codes et état UI

```js
online.exportCode();                    // dernier code produit
online.exportCode('offer');
online.exportCode('answer');
online.exportCode('reconnect-offer');
online.exportCode('reconnect-answer');

const {
  phase,             // idle, offer-ready, handshaking, ready...
  ready,
  role,
  sessionId,
  peerId,
  remotePeerId,
  revision,
  pendingActions,
  codeKind,
  hasExportableCode,
  error
} = online.status;
```

`online.status` est remplacé par un objet immuable à chaque transition. Les
phases possibles sont :

`idle`, `preparing`, `creating-offer`, `offer-ready`, `creating-answer`,
`answer-ready`, `connecting`, `handshaking`, `ready`, `reconnecting`,
`reconnect-offer-ready`, `reconnect-answer-ready`, `rejected`, `closed` et
`error`.

Le contrôleur émet aussi `status`, `code`, `ready`, `action-pending`,
`action-ack`, `action-rejected`, `snapshot`, `sequence-gap`,
`reconnect-needed`, `remote-close`, `rejected`, `error`,
`ui-callback-error` et `close`.

Callbacks UI disponibles :

- `onStatus(status)` ;
- `onCode({ kind, code })` ;
- `onReady(handshake)` ;
- `onActionPending({ action, options })` ;
- `onActionAck(ack)` ;
- `onActionRejected({ action, options, error })` ;
- `onActionTimeout(event)` ;
- `onRemoteAction({ action, meta, result })` ;
- `onSnapshot({ direction, state, revision?, meta? })` ;
- `onSnapshotRequest(event)` ;
- `onSequenceGap(event)` ;
- `onReconnectNeeded(event)` ;
- `onRejected(event)` ;
- `onRemoteClose(event)` puis `onClose(event)` à la fermeture effective ;
- `onError({ error, fatal, operation })`.

Tous reçoivent aussi le contrôleur en second argument. `setCallbacks()` permet
de les ajouter ou remplacer après construction. Une erreur de callback est
isolée et émise via `ui-callback-error`.

## Actions

```js
const ack = await online.sendAction({
  kind: 'DECLARE_ATTACK',
  attackerUid,
  targetUid
}, {
  baseRevision: game.networkRevision
});
```

L’interface doit attendre l’ACK avant une nouvelle mutation irréversible. Une
action distante est refusée par défaut si `validateRemoteAction` ou
`applyRemoteAction` n’est pas configuré.

## Snapshots publics

```js
const snapshot = await online.exportPublicSnapshot();
await online.requestPublicSnapshot('manual-ui-request');
```

`buildPublicSnapshot` est le seul producteur d’état envoyé au pair. Il doit
retirer :

- main adverse et cartes face cachée adverses ;
- ordre du Deck adverse ;
- décisions privées en attente ;
- callbacks, timers, objets DOM/audio et secrets locaux.

Le contrôleur vérifie taille, profondeur et compatibilité JSON, mais ne peut
pas déterminer si une propriété est secrète. Cette responsabilité reste dans
`game.buildSafeNetworkSnapshot`.

`requestPublicSnapshot(reason)` retourne une Promise résolue avec
`{ requestId, revision, state }`. `ping({ timeoutMs })` retourne une Promise
résolue avec le temps aller-retour en millisecondes.

## Reconnexion

```js
const offer = await hostOnline.createReconnectOffer();
const answer = await guestOnline.acceptReconnectOffer(offer);
await hostOnline.acceptReconnectAnswer(answer);
```

Les statuts `reconnecting`, `reconnect-offer-ready` et
`reconnect-answer-ready` doivent ouvrir le panneau de copie/collage.

`close(reason)` est idempotent et ferme la session et son transport.

## Modifications minimales à prévoir hors de ce dossier

### `game.js`

- Ajouter `networkRevision`.
- Ajouter `validateNetworkAction`, `applyNetworkAction`.
- Ajouter `buildSafeNetworkSnapshot`, `restoreSafeNetworkSnapshot`.
- Rendre tous les aléas déterministes/coordonnés par l’hôte.
- Relier chaque sélection différée à une action réseau explicite.

### `main.js`

- Instancier un contrôleur par duel.
- Router les actions locales vers `online.sendAction` en mode réseau.
- Ne pas démarrer le plateau tant que `online.status.ready` est faux.
- Désactiver les contrôles pendant une action en attente ou une resync.
- Appeler `online.close()` dans `pagehide` et au retour au menu.

### `index.html` / `style.css`

- Ajouter choix Solo/Héberger/Rejoindre.
- Ajouter champs Offre/Réponse, boutons Copier/Coller et région `aria-live`.
- Afficher statut, erreur de compatibilité et panneau de reconnexion.

La couche reste pair-à-pair et sans serveur autoritaire : elle ne peut pas
empêcher un client modifié de tricher ou de mentir sur son Deck.
