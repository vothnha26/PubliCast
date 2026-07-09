const fs = require('fs');
const path = require('path');

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const testDir = 'd:\\Fullit\\projects\\PubliCast\\test_selenium';
const allFiles = walkDir(testDir);

console.log('--- THỐNG KÊ TEST CASES SELENIUM ---');
let totalItCases = 0;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative(testDir, file);

  // Đếm các dòng chứa "it(" hoặc "it.only(" hoặc "it.skip(" bằng regex chính xác
  // Đảm bảo không bắt các chữ như wait(, write(, quit(,...
  const itMatches = content.match(/\bit(?:\.only|\.skip)?\s*\(/g);
  const itCount = itMatches ? itMatches.length : 0;

  if (itCount > 0) {
    console.log(`- ${relativePath}: ${itCount} test case(s)`);
    totalItCases += itCount;
  } else {
    // Với các file chạy node trực tiếp, không sử dụng mocha
    // Kiểm tra xem file có chạy tuần tự không. Thông thường các file test_*.js
    // là 1 test scenario đơn lẻ.
    if (path.basename(file).startsWith('test_') && !file.endsWith('test_auth_suite.js')) {
      console.log(`- ${relativePath}: 1 test case (chạy trực tiếp bằng node)`);
      totalItCases += 1;
    }
  }
}

console.log(`\nTổng số test cases sử dụng framework Mocha: ${totalItCases}`);
