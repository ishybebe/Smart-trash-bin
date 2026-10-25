#!/usr/bin/env node
'use strict';

const { seedDefaultAdmin, findAdminByUsername } = require('../src/services/adminService');

async function testDatabaseAdmin() {
  console.log('=== Testing MySQL-backed Admin Authentication ===\n');
  
  try {
    // 1. Seed the default admin
    console.log('1. Seeding default admin user...');
    await seedDefaultAdmin();
    
    // 2. Verify admin exists in database
    console.log('\n2. Querying admin from database...');
    const admin = await findAdminByUsername('admin');
    
    if (admin) {
      console.log('✓ Admin user found in database:');
      console.log('  - ID:', admin.id);
      console.log('  - Username:', admin.username);
      console.log('  - Role:', admin.role);
      console.log('  - Active:', admin.is_active === 1 ? 'Yes' : 'No');
      console.log('  - Password hash (first 20 chars):', admin.password_hash.substring(0, 20) + '...');
      console.log('  - Created:', admin.created_at);
    } else {
      console.error('✗ Admin user NOT found in database');
      process.exit(1);
    }
    
    console.log('\n=== SUCCESS: Admin authentication is now database-backed ===');
    process.exit(0);
  } catch (err) {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  }
}

testDatabaseAdmin();
