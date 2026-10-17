-- ========================================================
-- ShortsFlow: Database Initialization & Seed Script
-- ========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE video_status AS ENUM (
        'draft', 
        'pending_review', 
        'approved', 
        'rejected', 
        'scheduled', 
        'publishing', 
        'published', 
        'failed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_action AS ENUM ('approve', 'reject');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_channel AS ENUM ('dashboard', 'telegram');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telegram_user_id BIGINT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dynamic Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    level INT NOT NULL DEFAULT 1,
    can_final_approve BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Roles Pivot
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 4. Videos Table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    script TEXT NOT NULL,
    prompt_used TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    duration_seconds NUMERIC(5,2) DEFAULT 45.0,
    aspect_ratio VARCHAR(10) DEFAULT '9:16',
    platform_targets JSONB NOT NULL DEFAULT '["youtube"]'::jsonb,
    
    -- State & Anti-Race Condition Locks
    status video_status NOT NULL DEFAULT 'draft',
    current_level INT NOT NULL DEFAULT 1,
    required_max_level INT NOT NULL DEFAULT 2,
    version INT NOT NULL DEFAULT 1,
    
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_videos_status_level ON videos(status, current_level);

-- 5. Approvals Audit Log
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    level INT NOT NULL,
    action approval_action NOT NULL,
    channel approval_channel NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_video_id ON approvals(video_id);

-- 6. Publishing Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) DEFAULT 'queued',
    platform_post_id VARCHAR(255),
    error_message TEXT,
    published_at TIMESTAMPTZ
);

-- 7. Analytics Data
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    subs_gained INT DEFAULT 0,
    watch_time_minutes NUMERIC(10,2) DEFAULT 0,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- SEED DATA (Farras = Admin & L2, Michael = Reviewer L1)
-- ========================================================

-- Insert Roles
INSERT INTO roles (id, name, label, level, can_final_approve, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin', 'Admin', 0, TRUE, TRUE),
    ('22222222-2222-2222-2222-222222222222', 'reviewer_level_1', 'Reviewer Level 1', 1, FALSE, TRUE),
    ('33333333-3333-3333-3333-333333333333', 'reviewer_level_2', 'Reviewer Level 2', 2, TRUE, TRUE),
    ('44444444-4444-4444-4444-444444444444', 'viewer', 'Viewer', 99, FALSE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert Users (Password: 'password123' bcrypt hash: $2a$10$7zV.k6yU0yE2vG5O0K4CFe0h8c.w0xL0/e1w0/e1w0/e1w0/e1w0.)
INSERT INTO users (id, name, email, password_hash, avatar_url, is_active)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Farras', 'farras@shortsflow.ai', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKWA2W2y', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', TRUE),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Michael', 'michael@shortsflow.ai', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKWA2W2y', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Assign Roles: Farras -> Admin & Reviewer L2
INSERT INTO user_roles (user_id, role_id)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- Assign Roles: Michael -> Reviewer L1
INSERT INTO user_roles (user_id, role_id)
VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;
