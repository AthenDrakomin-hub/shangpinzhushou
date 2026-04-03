import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shangpinzhushou',
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create chief engineer
    const chiefEmail = 'athendrakomin@proton.me';
    const chiefPassword = await bcrypt.hash('123456', 10);
    const chiefId = crypto.randomUUID();
    
    // Check if chief exists
    const existingChief = await client.query('SELECT id FROM public.users WHERE email = $1', [chiefEmail]);
    let actualChiefId = chiefId;
    if (existingChief.rows.length === 0) {
      await client.query(`
        INSERT INTO public.users (id, email, encrypted_password, display_name, role, status, merchant_on, secret_key)
        VALUES ($1, $2, $3, $4, 'chief_engineer', 'active', $5, $6)
      `, [chiefId, chiefEmail, chiefPassword, '首席工程师', 'SP_CHIEF', crypto.randomBytes(16).toString('hex')]);
      console.log('Created Chief Engineer');
    } else {
      actualChiefId = existingChief.rows[0].id;
      await client.query(`UPDATE public.users SET role = 'chief_engineer' WHERE id = $1`, [actualChiefId]);
      console.log('Updated existing user to Chief Engineer');
    }

    // Create 3 Managers
    for (let i = 1; i <= 3; i++) {
      const managerEmail = `jingli00${i}`;
      const managerPassword = await bcrypt.hash('123456', 10);
      const managerId = crypto.randomUUID();
      
      const existingManager = await client.query('SELECT id FROM public.users WHERE email = $1', [managerEmail]);
      let actualManagerId = managerId;
      if (existingManager.rows.length === 0) {
        await client.query(`
          INSERT INTO public.users (id, email, encrypted_password, display_name, role, status, created_by, merchant_on, secret_key)
          VALUES ($1, $2, $3, $4, 'manager', 'active', $5, $6, $7)
        `, [managerId, managerEmail, managerPassword, `经理00${i}`, actualChiefId, `SP_M${i}`, crypto.randomBytes(16).toString('hex')]);
        
        await client.query(`INSERT INTO public.wallets (user_id) VALUES ($1)`, [managerId]);
        console.log(`Created Manager: ${managerEmail}`);
      } else {
        actualManagerId = existingManager.rows[0].id;
      }

      // Create 3 Supervisors per Manager
      for (let j = 1; j <= 3; j++) {
        const supervisorEmail = `zhuguan00${j}_m${i}`; // Ensure uniqueness
        // But user asked for zhuguan001, zhuguan002, zhuguan003. If login is email, we can make email zhuguan001@jingli001.com
        const actualEmail = `zhuguan00${j}@jingli00${i}.com`;
        const supervisorPassword = await bcrypt.hash('123456', 10);
        const supervisorId = crypto.randomUUID();
        
        const existingSup = await client.query('SELECT id FROM public.users WHERE email = $1', [actualEmail]);
        if (existingSup.rows.length === 0) {
          await client.query(`
            INSERT INTO public.users (id, email, encrypted_password, display_name, role, status, created_by, merchant_on, secret_key)
            VALUES ($1, $2, $3, $4, 'supervisor', 'active', $5, $6, $7)
          `, [supervisorId, actualEmail, supervisorPassword, `主管00${j}`, actualManagerId, `SP_S${i}${j}`, crypto.randomBytes(16).toString('hex')]);
          
          await client.query(`INSERT INTO public.wallets (user_id) VALUES ($1)`, [supervisorId]);
          console.log(`Created Supervisor: ${actualEmail} under Manager ${i}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error seeding:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
