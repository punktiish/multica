UPDATE agent_runtime SET runtime_mode = 'local' WHERE runtime_mode <> 'local';
UPDATE agent SET runtime_mode = 'local' WHERE runtime_mode <> 'local';

ALTER TABLE agent_runtime DROP CONSTRAINT IF EXISTS agent_runtime_runtime_mode_check;
ALTER TABLE agent_runtime
  ADD CONSTRAINT agent_runtime_runtime_mode_check CHECK (runtime_mode = 'local');

ALTER TABLE agent DROP CONSTRAINT IF EXISTS agent_runtime_mode_check;
ALTER TABLE agent
  ADD CONSTRAINT agent_runtime_mode_check CHECK (runtime_mode = 'local');
