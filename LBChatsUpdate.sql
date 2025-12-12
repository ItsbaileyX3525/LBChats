ALTER TABLE users MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT NULL;
ALTER TABLE sessions MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT NULL;
ALTER TABLE messages MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT NULL;

UPDATE users SET profile_picture = NULL WHERE profile_picture IS '/assets/images/profile.png';
UPDATE sessions SET profile_picture = NULL WHERE profile_picture IS NOT '/assets/images/profile.png';
UPDATE messages SET profile_picture = NULL WHERE profile_picture IS NOT '/assets/images/profile.png';