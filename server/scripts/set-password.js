import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'document_flow_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgre',
});

async function setPassword(username, newPassword) {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    const result = await pool.query(
      'UPDATE User_Tbl SET Password = $1 WHERE User_Name = $2 RETURNING User_Name, User_Role',
      [hashedPassword, username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User "${username}" not found`);
      return false;
    }

    console.log(`✅ Password updated successfully for user: ${result.rows[0].User_Name} (${result.rows[0].User_Role})`);
    return true;
  } catch (error) {
    console.error('Error setting password:', error);
    return false;
  }
}

// Get username and password from command line arguments
const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.log('Usage: node set-password.js <username> <new_password>');
  console.log('Example: node set-password.js superadmin superadmin123');
  process.exit(1);
}

setPassword(username, password)
  .then((success) => {
    if (success) {
      console.log('\n✅ Done! You can now login with the new password.');
    } else {
      console.log('\n❌ Failed to update password.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

