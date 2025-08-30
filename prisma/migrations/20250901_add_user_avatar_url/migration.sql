-- Migration: add_user_avatar_url
-- Generated manually for Render deploy
-- Date: 2025-09-01

ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
