import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Move up one level from 'scripts' to root, then into android
const androidPath = path.join(__dirname, '..', 'android');

console.log('🔧 Starting Android Project Auto-Fix (Aggressive)...');

if (!fs.existsSync(androidPath)) {
  console.error('❌ Android folder not found. Run "npx cap add android" first.');
  process.exit(1);
}

// 1. Fix Gradle Wrapper (Upgrade to 8.5)
const wrapperPath = path.join(androidPath, 'gradle', 'wrapper', 'gradle-wrapper.properties');
try {
  if (fs.existsSync(wrapperPath)) {
    let content = fs.readFileSync(wrapperPath, 'utf8');
    // Regex to match distributionUrl regardless of existing version
    const newContent = content.replace(
      /distributionUrl=.*gradle-.*-all\.zip/, 
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-all.zip'
    );
    fs.writeFileSync(wrapperPath, newContent);
    console.log('✅ Updated Gradle Wrapper to 8.5');
  } else {
    console.warn('⚠️ Could not find gradle-wrapper.properties');
  }
} catch (e) {
  console.error('❌ Failed to update Gradle Wrapper:', e);
}

// 2. Fix Build Gradle Plugin (Upgrade to 8.3.0 for Java 21 compatibility)
const buildGradlePath = path.join(androidPath, 'build.gradle');
try {
  if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');
    // robust regex that handles single or double quotes
    const newContent = content.replace(
        /classpath\s+['"]com\.android\.tools\.build:gradle:[^'"]+['"]/, 
        "classpath 'com.android.tools.build:gradle:8.3.0'"
    );
    fs.writeFileSync(buildGradlePath, newContent);
    console.log('✅ Updated Android Gradle Plugin to 8.3.0');
  } else {
    console.warn('⚠️ Could not find root build.gradle');
  }
} catch (e) {
  console.error('❌ Failed to update build.gradle:', e);
}

// 3. Fix Variables (Ensure SDK 34)
const variablesPath = path.join(androidPath, 'variables.gradle');
try {
  if (fs.existsSync(variablesPath)) {
    let content = fs.readFileSync(variablesPath, 'utf8');
    // Force SDK 34
    let newContent = content.replace(/compileSdkVersion\s*=\s*\d+/, 'compileSdkVersion = 34');
    newContent = newContent.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 34');
    fs.writeFileSync(variablesPath, newContent);
    console.log('✅ Updated Android SDK Target to 34');
  }
} catch (e) {
  console.error('❌ Failed to update variables.gradle:', e);
}

console.log('🚀 Android Project Fixed! Java 21 Compatibility Applied.');