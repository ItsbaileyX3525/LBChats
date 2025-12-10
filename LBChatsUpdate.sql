ALTER TABLE users MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT '/assets/images/profile.png';
ALTER TABLE sessions MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT '/assets/images/profile.png';
ALTER TABLE messages MODIFY COLUMN profile_picture VARCHAR(255) DEFAULT '/assets/images/profile.png';

UPDATE users SET profile_picture = '/assets/images/profile.png' WHERE profile_picture IS NULL;
UPDATE sessions SET profile_picture = '/assets/images/profile.png' WHERE profile_picture IS NULL;
UPDATE messages SET profile_picture = '/assets/images/profile.png' WHERE profile_picture IS NULL;