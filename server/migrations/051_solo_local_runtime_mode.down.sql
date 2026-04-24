ALTER TABLE agent_runtime DROP CONSTRAINT IF EXISTS agent_runtime_runtime_mode_check;
ALTER TABLE agent_runtime
  ADD CONSTRAINT agent_runtime_runtime_mode_check CHECK (runtime_mode IN ('local', 'cloud'));

ALTER TABLE agent DROP CONSTRAINT IF EXISTS agent_runtime_mode_check;
ALTER TABLE agent
  ADD CONSTRAINT agent_runtime_mode_check CHECK (runtime_mode IN ('local', 'cloud'));
