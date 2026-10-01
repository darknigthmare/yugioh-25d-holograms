/**
 * Event snapshots for explicitly scripted Trigger Effects. Events wait for
 * their legal boundary instead of interrupting an effect or resolving Chain.
 */
export class TriggerEventEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.events = [];
    this.nextEventId = 1;
  }

  enqueue(card, type, details = {}) {
    if (!card || !type) return null;
    const event = Object.freeze({
      ...details,
      eventId: this.nextEventId++,
      type,
      card,
      sourceUid: card.uid,
      sourceRuntimeInstanceId: card.runtimeInstanceId,
      sourceLocation: card.location,
      controllerId: details.controllerId || card.controllerId,
      boundary: details.boundary || 'immediate'
    });
    this.events.push(event);
    return event;
  }

  hasReadyEvents(boundary = 'immediate') {
    return this.events.some(event => event.boundary === 'immediate' || event.boundary === boundary);
  }

  takeReadyEvents(boundary = 'immediate') {
    const ready = [];
    this.events = this.events.filter(event => {
      if (event.boundary !== 'immediate' && event.boundary !== boundary) return true;
      ready.push(event);
      return false;
    });
    return ready;
  }

  /** Same-group order belongs to the controller; the four groups are fixed. */
  getSEGOCGroups(candidates, turnPlayerId) {
    const other = turnPlayerId === 'player' ? 'opponent' : 'player';
    return [
      { controllerId: turnPlayerId, mandatory: true },
      { controllerId: other, mandatory: true },
      { controllerId: turnPlayerId, mandatory: false },
      { controllerId: other, mandatory: false }
    ].map(group => ({
      ...group,
      candidates: candidates.filter(candidate => candidate.controllerId === group.controllerId
        && Boolean(candidate.mandatory) === group.mandatory)
    })).filter(group => group.candidates.length);
  }
}
