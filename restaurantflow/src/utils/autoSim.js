// Utility to control automatic/simulated behaviors across the app.
export const isAutoSimulationEnabled = () => {
  try {
    const raw = localStorage.getItem('auto_simulation_enabled');
    if (raw !== null) return raw === 'true';
  } catch (e) {
    // ignore
  }
  // Default: simulation disabled. Set localStorage key to 'true' to enable.
  return false;
};

export const simDelay = (ms) => (isAutoSimulationEnabled() ? ms : 0);

export const shouldSimulate = isAutoSimulationEnabled;

export default { isAutoSimulationEnabled, simDelay, shouldSimulate };
