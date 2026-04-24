CREATE TABLE verification_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_verification_code_email ON verification_code(email, used, expires_at);

CREATE TABLE personal_access_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    token_prefix TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pat_user ON personal_access_token(user_id, revoked);
CREATE UNIQUE INDEX idx_pat_token_hash ON personal_access_token(token_hash);

CREATE TABLE daemon_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    daemon_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX daemon_token_workspace_idx ON daemon_token(workspace_id);
CREATE INDEX daemon_token_expires_idx ON daemon_token(expires_at);

CREATE TABLE workspace_invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES "user"(id),
    invitee_email TEXT NOT NULL,
    invitee_user_id UUID REFERENCES "user"(id),
    role TEXT NOT NULL CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
    status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','revoked','expired')) DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invitation_unique_pending
    ON workspace_invitation(workspace_id, invitee_email) WHERE status = 'pending';

CREATE INDEX idx_invitation_invitee_email ON workspace_invitation(invitee_email) WHERE status = 'pending';
CREATE INDEX idx_invitation_invitee_user  ON workspace_invitation(invitee_user_id) WHERE status = 'pending';
