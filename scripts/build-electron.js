const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Arkive Tax Management System for Desktop...\n');

try {
  // Step 1: Build the web application
  console.log('📦 Step 1: Building web application...');
  execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
  console.log('✅ Web application built successfully!\n');

  // Step 2: Navigate to electron directory
  console.log('📁 Step 2: Preparing Electron environment...');
  const electronDir = path.join(process.cwd(), 'electron');
  
  if (!fs.existsSync(electronDir)) {
    throw new Error('Electron directory not found!');
  }

  // Step 3: Install electron dependencies
  console.log('📦 Step 3: Installing Electron dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: electronDir });
  console.log('✅ Electron dependencies installed!\n');

  // Step 4: Create assets directory if it doesn't exist
  const assetsDir = path.join(electronDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log('📁 Created assets directory');
  }

  // Step 5: Copy icon files (create placeholder if not exists)
  const iconFiles = [
    { name: 'icon.png', size: '256x256' },
    { name: 'icon.ico', size: '256x256' },
    { name: 'icon.icns', size: '256x256' }
  ];

  iconFiles.forEach(icon => {
    const iconPath = path.join(assetsDir, icon.name);
    if (!fs.existsSync(iconPath)) {
      console.log(`⚠️  ${icon.name} not found, creating placeholder...`);
      // Create a simple text file as placeholder
      fs.writeFileSync(iconPath, `Arkive Icon Placeholder - ${icon.size}`);
    }
  });

  // Step 6: Build the desktop application
  console.log('🔨 Step 4: Building desktop application...');
  console.log('This may take several minutes...\n');
  
  execSync('npm run build', { stdio: 'inherit', cwd: electronDir });
  
  console.log('\n🎉 SUCCESS! Desktop application built successfully!');
  console.log('\n📍 Location: electron/dist/');
  console.log('📁 Check the electron/dist folder for the executable files.');
  console.log('\n📋 Build Summary:');
  console.log('   • Windows: .exe installer with NSIS');
  console.log('   • Includes desktop shortcut');
  console.log('   • Includes start menu shortcut');
  console.log('   • Professional installer interface');
  console.log('   • Optimized with maximum compression');
  
  // List the generated files
  const distDir = path.join(electronDir, 'dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log('\n📦 Generated Files:');
    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   • ${file} (${sizeInMB} MB)`);
    });
  }

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Ensure Node.js is installed (v16 or higher)');
  console.log('   2. Check internet connection for dependency downloads');
  console.log('   3. Verify all dependencies are properly installed');
  console.log('   4. Try running: npm install && npm run build');
  process.exit(1);
}