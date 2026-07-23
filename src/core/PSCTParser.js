/**
 * PSCTParser parses Problem-Solving Card Text (PSCT) to divide cards
 * behavior into Conditions, Activation Costs/Targets, and Resolutions.
 */
export class PSCTParser {
  /**
   * Parses text of a card into structural properties
   * @param {string} text - Card text description
   * @returns {Object} { conditions, costActions, resolutionEffects }
   */
  static parse(text) {
    if (!text) {
      return { conditions: [], costActions: [], resolutionEffects: [], conjunctions: [] };
    }

    const sentences = text.split(/[.!?]\s+/);
    const parsedSentences = sentences.map(s => this.parseSentence(s.trim()));

    // Flatten lists
    const conditions = parsedSentences.flatMap(p => p.condition ? [p.condition] : []);
    const costActions = parsedSentences.flatMap(p => p.cost ? [p.cost] : []);
    const resolutionEffects = parsedSentences.flatMap(p => p.resolution ? [p.resolution] : []);
    const conjunctions = parsedSentences.flatMap(p => p.conjunctions || []);

    return {
      conditions,
      costActions,
      resolutionEffects,
      conjunctions,
      parsedSentences
    };
  }

  /**
   * Parse a single sentence following the pattern:
   * [CONDITION] : [ACTIVATION COSTS / TARGETS] ; [RESOLUTIONS]
   */
  static parseSentence(sentence) {
    if (!sentence) return {};

    let condition = null;
    let cost = null;
    let resolution = sentence;

    // Check for condition colon ":"
    const colonIdx = sentence.indexOf(':');
    if (colonIdx !== -1) {
      condition = sentence.substring(0, colonIdx).trim();
      const remainder = sentence.substring(colonIdx + 1).trim();

      // Check for cost semicolon ";"
      const semiIdx = remainder.indexOf(';');
      if (semiIdx !== -1) {
        cost = remainder.substring(0, semiIdx).trim();
        resolution = remainder.substring(semiIdx + 1).trim();
      } else {
        resolution = remainder;
      }
    } else {
      // Check for cost semicolon ";" even without condition
      const semiIdx = sentence.indexOf(';');
      if (semiIdx !== -1) {
        cost = sentence.substring(0, semiIdx).trim();
        resolution = sentence.substring(semiIdx + 1).trim();
      }
    }

    // Determine conjunction patterns inside resolution
    const conjunctions = this.parseConjunctions(resolution);

    return {
      raw: sentence,
      condition,
      cost,
      resolution,
      conjunctions
    };
  }

  /**
   * Identifies TCG conjunction keywords inside resolution block:
   * - "then" (sequential, B depends on A)
   * - "and if you do" (simultaneous, B depends on A)
   * - "also" (simultaneous, A and B are independent)
   * - "and" (simultaneous, A and B are dependent)
   * - "also, after that" (sequential, A and B are independent)
   */
  static parseConjunctions(resolutionText) {
    if (!resolutionText) return [];

    const conjunctions = [];
    const lowerText = resolutionText.toLowerCase();

    const keywords = [
      { key: "and if you do", type: "AND_IF_YOU_DO", simultaneous: true, dependent: true },
      { key: "et si vous le faites", type: "AND_IF_YOU_DO", simultaneous: true, dependent: true },
      { key: "also, after that", type: "ALSO_AFTER_THAT", simultaneous: false, dependent: false },
      { key: "et aussi, après cela", type: "ALSO_AFTER_THAT", simultaneous: false, dependent: false },
      { key: "then", type: "THEN", simultaneous: false, dependent: true },
      { key: "puis", type: "THEN", simultaneous: false, dependent: true },
      { key: "also", type: "ALSO", simultaneous: true, dependent: false },
      { key: "et aussi", type: "ALSO", simultaneous: true, dependent: false },
      { key: "and", type: "AND", simultaneous: true, dependent: true },
      { key: "et", type: "AND", simultaneous: true, dependent: true }
    ];

    keywords.forEach(kw => {
      let index = lowerText.indexOf(kw.key);
      while (index !== -1) {
        conjunctions.push({
          keyword: kw.key,
          type: kw.type,
          simultaneous: kw.simultaneous,
          dependent: kw.dependent,
          index
        });
        index = lowerText.indexOf(kw.key, index + kw.key.length);
      }
    });

    // Sort by appearance index
    return conjunctions.sort((a, b) => a.index - b.index);
  }
}
