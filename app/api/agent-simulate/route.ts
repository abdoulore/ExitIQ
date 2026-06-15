import { parseAgentSimulationInput, simulateAgentDecision } from "@/lib/agent";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = parseAgentSimulationInput(body);
    const result = simulateAgentDecision(input);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid agent simulation request." },
      { status: 400 },
    );
  }
}

