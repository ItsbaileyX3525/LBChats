ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL;
ALTER TABLE sessions ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL;
ALTER TABLE messages ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL;
ALTER TABLE channels ADD COLUMN moderators json DEFAULT NULL;
ALTER TABLE users ADD COLUMN banned_channels json DEFAULT NULL;

UPDATE users SET profile_picture = NULL WHERE profile_picture = '/assets/images/profile.png';
UPDATE sessions SET profile_picture = NULL WHERE profile_picture = '/assets/images/profile.png';
UPDATE messages SET profile_picture = NULL WHERE profile_picture = '/assets/images/profile.png';