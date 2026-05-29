import type { Demo, DeploymentStep } from "../../types";
import type { Inspection } from "../../api/demos";

export interface DeployState {
  file: File | null;
  name: string;
  inspection: Inspection | null;
  steps: DeploymentStep[];
  latestDemo: Demo | null;
  deploying: boolean;
  updateTarget: Demo | null;
}

export type DeployAction =
  | { type: "RESET"; keepUpdateTarget?: boolean }
  | { type: "SET_FILE"; file: File | null }
  | { type: "SET_NAME"; name: string }
  | { type: "SET_INSPECTION"; inspection: Inspection | null }
  | { type: "SET_STEPS"; steps: DeploymentStep[] }
  | { type: "SET_DEPLOYING"; deploying: boolean }
  | { type: "SET_LATEST_DEMO"; demo: Demo | null }
  | { type: "START_UPDATE"; demo: Demo }
  | { type: "START_CREATE" };

export function createInitialDeployState(): DeployState {
  return {
    file: null,
    name: "",
    inspection: null,
    steps: [],
    latestDemo: null,
    deploying: false,
    updateTarget: null,
  };
}

export function deployReducer(state: DeployState, action: DeployAction): DeployState {
  switch (action.type) {
    case "RESET":
      return {
        ...createInitialDeployState(),
        updateTarget: action.keepUpdateTarget ? state.updateTarget : null,
      };
    case "SET_FILE":
      return { ...state, file: action.file };
    case "SET_NAME":
      return { ...state, name: action.name };
    case "SET_INSPECTION":
      return { ...state, inspection: action.inspection };
    case "SET_STEPS":
      return { ...state, steps: action.steps };
    case "SET_DEPLOYING":
      return { ...state, deploying: action.deploying };
    case "SET_LATEST_DEMO":
      return { ...state, latestDemo: action.demo };
    case "START_UPDATE":
      return {
        ...createInitialDeployState(),
        updateTarget: action.demo,
        name: action.demo.name || "",
      };
    case "START_CREATE":
      return {
        ...createInitialDeployState(),
      };
    default:
      return state;
  }
}