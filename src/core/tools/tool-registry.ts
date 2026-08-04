import type { ToolDefinition, ToolExecutionContext, ToolRegistry } from "@/core/types";

export class DefaultToolRegistry implements ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  async execute(
    name: string,
    context: ToolExecutionContext,
  ): Promise<Record<string, unknown>> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.execute(context);
  }
}

export function createToolRegistry(tools: ToolDefinition[]): ToolRegistry {
  const registry = new DefaultToolRegistry();
  for (const tool of tools) {
    registry.register(tool);
  }
  return registry;
}
