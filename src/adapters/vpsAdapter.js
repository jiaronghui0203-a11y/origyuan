import { buildResponse } from "../utils/response.js";

export function createVpsAdapter(config) {
  return {
    async mockRunCommand(command) {
      return buildResponse({
        source: "vps",
        message: "Mock VPS command prepared. No SSH command was executed.",
        data: {
          command,
          host: config.vps.sshHost,
          port: config.vps.sshPort,
          user: config.vps.sshUser,
          mode: config.taskMode,
          stdout: `mock output for: ${command || ""}`,
          stderr: "",
          exitCode: 0
        }
      });
    },

    async runCommand(command) {
      throw new Error(`Real SSH execution is not enabled. Requested command: ${command || ""}`);
    }
  };
}
