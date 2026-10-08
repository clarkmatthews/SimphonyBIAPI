-- Named Oracle connection profiles with one active profile on jobui_settings.
-- OIDC tokens are stored per profile so switching environments does not reuse tokens.

CREATE TABLE IF NOT EXISTS jobui_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL UNIQUE,
    auth_host       text,
    app_host        text,
    client_id       text,
    api_username    text,
    api_password    text,
    org_name        text,
    org_identifier  text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jobui_settings
    ADD COLUMN IF NOT EXISTS active_profile_id uuid REFERENCES jobui_profiles(id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobui_settings' AND column_name = 'auth_host'
    ) THEN
        INSERT INTO jobui_profiles (
            name, auth_host, app_host, client_id, api_username, api_password, org_name, org_identifier
        )
        SELECT
            'Default',
            NULLIF(auth_host, ''),
            NULLIF(app_host, ''),
            NULLIF(client_id, ''),
            NULLIF(api_username, ''),
            NULLIF(api_password, ''),
            NULLIF(org_name, ''),
            NULLIF(org_identifier, '')
        FROM jobui_settings
        WHERE id = 1
          AND (
              NULLIF(auth_host, '') IS NOT NULL
              OR NULLIF(app_host, '') IS NOT NULL
              OR NULLIF(client_id, '') IS NOT NULL
              OR NULLIF(api_username, '') IS NOT NULL
              OR NULLIF(api_password, '') IS NOT NULL
              OR NULLIF(org_name, '') IS NOT NULL
              OR NULLIF(org_identifier, '') IS NOT NULL
          )
        ON CONFLICT (name) DO NOTHING;

        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS auth_host;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS app_host;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS client_id;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS api_username;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS api_password;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS org_name;
        ALTER TABLE jobui_settings DROP COLUMN IF EXISTS org_identifier;
    END IF;
END $$;

INSERT INTO jobui_profiles (name) VALUES ('Mock'), ('Dev'), ('Prod')
ON CONFLICT (name) DO NOTHING;

UPDATE jobui_settings
SET active_profile_id = COALESCE(
    active_profile_id,
    (SELECT id FROM jobui_profiles WHERE name = 'Default' LIMIT 1),
    (SELECT id FROM jobui_profiles ORDER BY created_at, name LIMIT 1)
)
WHERE id = 1 AND active_profile_id IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'jobui_oidc_tokens' AND column_name = 'id'
    ) THEN
        CREATE TABLE jobui_oidc_tokens_new (
            profile_id    uuid PRIMARY KEY REFERENCES jobui_profiles(id) ON DELETE CASCADE,
            id_token      text,
            refresh_token text,
            expires_at    timestamptz,
            obtained_at   timestamptz,
            updated_at    timestamptz NOT NULL DEFAULT now()
        );

        INSERT INTO jobui_oidc_tokens_new (profile_id, id_token, refresh_token, expires_at, obtained_at, updated_at)
        SELECT s.active_profile_id, t.id_token, t.refresh_token, t.expires_at, t.obtained_at, t.updated_at
        FROM jobui_oidc_tokens t
        CROSS JOIN jobui_settings s
        WHERE t.id = 1
          AND s.active_profile_id IS NOT NULL
          AND (t.id_token IS NOT NULL OR t.refresh_token IS NOT NULL);

        DROP TABLE jobui_oidc_tokens;
        ALTER TABLE jobui_oidc_tokens_new RENAME TO jobui_oidc_tokens;
    END IF;
END $$;
