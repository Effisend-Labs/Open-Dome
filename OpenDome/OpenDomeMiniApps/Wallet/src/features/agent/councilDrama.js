import { DAY_PLANNER_AGENTS } from 'opendome/src/dayPlannerAgents';

export { DAY_PLANNER_AGENTS };

export const COUNCIL_PHASES = {
  ANCHOR: 'anchor',
  SCOUTING: 'scouting',
  SCHEDULING: 'scheduling',
  JUDGING: 'judging',
  WINNER: 'winner',
  AWAITING_CONFIRM: 'awaiting_confirm',
  PAYING: 'paying',
  DONE: 'done',
};

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initialCouncilAgents() {
  return DAY_PLANNER_AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    status: 'idle',
    summary: null,
    score: null,
    feasible: null,
  }));
}

/**
 * Play a visible multi-agent deliberation using a finished council result.
 * Calls onUpdate({ phase, agents, winner, note }) as the story advances.
 */
export async function playCouncilDeliberation(proposal, { onUpdate, signal } = {}) {
  const council = proposal?.council;
  if (!council) {
    onUpdate?.({ phase: COUNCIL_PHASES.WINNER, agents: [], winner: null, note: null });
    return;
  }

  const byId = new Map((council.candidates || []).map((c) => [c.id, c]));
  let agents = initialCouncilAgents();

  const emit = (phase, patch = {}) => {
    if (signal?.aborted) throw new Error('aborted');
    onUpdate?.({ phase, agents: agents.map((a) => ({ ...a })), ...patch });
  };

  emit(COUNCIL_PHASES.ANCHOR, {
    note: council.anchor?.notes?.[0] || 'Locking doors and travel buffer…',
  });
  await sleep(700);

  emit(COUNCIL_PHASES.SCOUTING, {
    note: 'Four agents are drafting competing day plans…',
  });

  for (const agent of agents) {
    agents = agents.map((a) =>
      a.id === agent.id ? { ...a, status: 'thinking' } : a,
    );
    emit(COUNCIL_PHASES.SCOUTING, {
      note: `${agent.name} (${agent.role}) is scouting amenities…`,
    });
    await sleep(650);

    const cand = byId.get(agent.id);
    agents = agents.map((a) =>
      a.id === agent.id
        ? {
            ...a,
            status: 'done',
            summary: cand?.summary || '—',
            score: cand?.score ?? null,
            feasible: cand?.feasible ?? true,
          }
        : a,
    );
    emit(COUNCIL_PHASES.SCOUTING, {
      note: `${agent.name} proposed: ${cand?.summary || 'plan ready'}`,
    });
    await sleep(400);
  }

  emit(COUNCIL_PHASES.SCHEDULING, {
    note: 'Checking open hours, durations, and doors buffer…',
  });
  await sleep(800);

  emit(COUNCIL_PHASES.JUDGING, {
    note: 'Critic ranking all four plans…',
  });
  await sleep(700);

  const winner = council.winner;
  agents = agents.map((a) => ({
    ...a,
    status: a.id === winner?.id ? 'winner' : a.status === 'done' ? 'done' : a.status,
  }));

  emit(COUNCIL_PHASES.WINNER, {
    winner,
    note: winner
      ? `${winner.name} wins — ${winner.reasons?.[0] || 'best overall fit'}`
      : 'Plan ready',
  });
  await sleep(600);
}
