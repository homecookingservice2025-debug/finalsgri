import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length > 1) {
        const key = parts[0].trim();
        const val = parts[1].trim();
        console.log(`${key}: ${val.substring(0, 5)}...${val.substring(val.length - 5)}`);
      }
    });
  } else {
    console.log('.env file not found at ' + envPath);
  }
} catch (e) {
  console.log('Error reading .env');
}
