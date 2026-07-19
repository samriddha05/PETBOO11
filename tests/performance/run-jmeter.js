const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const JMX_FILE = path.join(__dirname, 'petsphere_load_test.jmx');
const JTL_FILE = path.join(__dirname, 'results.jtl');
const REPORT_DIR = path.join(__dirname, 'report');

function findJMeter() {
  // 1. Try finding in environment variable
  if (process.env.JMETER_PATH) {
    return process.env.JMETER_PATH;
  }

  // 2. Try running jmeter directly (checking if it is in PATH)
  try {
    const checkCmd = process.platform === 'win32' ? 'where jmeter' : 'which jmeter';
    execSync(checkCmd, { stdio: 'ignore' });
    return 'jmeter';
  } catch (e) {
    // ignore
  }

  return null;
}

function run() {
  const jmeterCmd = findJMeter();

  if (!jmeterCmd) {
    console.error('======================================================================');
    console.error('❌ Apache JMeter was not found on your system PATH or environment.');
    console.error('======================================================================');
    console.error('\nTo run performance tests:');
    console.error('1. Download Apache JMeter: https://jmeter.apache.org/download_jmeter.cgi');
    console.error('2. Extract the download and set the environment variable JMETER_PATH');
    console.error('   to the jmeter executable (e.g. C:\\apache-jmeter\\bin\\jmeter.bat on Windows)');
    console.error('3. Alternatively, you can open Apache JMeter GUI and load the test plan:');
    console.error(`   📂 ${JMX_FILE}`);
    console.error('\nOr run via command line once JMETER_PATH is set:');
    console.error(`   $env:JMETER_PATH="C:\\path\\to\\jmeter.bat"; npm run test:performance\n`);
    process.exit(1);
  }

  console.log(`🚀 Found Apache JMeter: ${jmeterCmd}`);
  console.log(`📋 Running Test Plan: ${JMX_FILE}`);

  // Clean old results
  if (fs.existsSync(JTL_FILE)) {
    console.log(`🧹 Removing old results log: ${JTL_FILE}`);
    fs.unlinkSync(JTL_FILE);
  }
  if (fs.existsSync(REPORT_DIR)) {
    console.log(`🧹 Removing old HTML report directory: ${REPORT_DIR}`);
    fs.rmSync(REPORT_DIR, { recursive: true, force: true });
  }

  const runCommand = `"${jmeterCmd}" -n -t "${JMX_FILE}" -l "${JTL_FILE}" -e -o "${REPORT_DIR}"`;
  console.log(`💻 Executing: ${runCommand}`);

  try {
    execSync(runCommand, { stdio: 'inherit' });
    console.log('\n✅ JMeter Load Test Completed Successfully!');
    console.log(`📊 Raw Results saved to: ${JTL_FILE}`);
    console.log(`📈 HTML Dashboard Report generated at: ${path.join(REPORT_DIR, 'index.html')}`);
  } catch (err) {
    console.error('\n❌ JMeter execution failed.');
    console.error(err.message);
    process.exit(1);
  }
}

run();
