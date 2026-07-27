require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Tự động tạo Bug ticket trên Jira khi Selenium Test thất bại
 * @param {string} summary           - Tiêu đề lỗi ngắn gọn
 * @param {object} bugDetails        - Chi tiết lỗi theo mẫu chuẩn
 *   @param {string} bugDetails.description    - Mô tả ngắn gọn về lỗi
 *   @param {string[]} bugDetails.stepsToReproduce - Các bước tái hiện lỗi
 *   @param {string} bugDetails.expectedResult - Kết quả mong đợi
 *   @param {string} bugDetails.actualResult   - Kết quả thực tế
 *   @param {string} bugDetails.testUrl        - URL đang kiểm thử
 *   @param {string} bugDetails.browser        - Trình duyệt đang dùng
 *   @param {string} bugDetails.priority       - Mức độ ưu tiên (Critical/High/Medium/Low)
 *   @param {string} [bugDetails.errorStack]   - Stack trace lỗi (nếu có)
 * @param {string} screenshotPath    - Đường dẫn ảnh chụp màn hình lỗi (optional)
 */
async function reportBugToJira(summary, bugDetails = {}, screenshotPath = null) {
  const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
  const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL;
  const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
  const PROJECT_KEY = 'PC'; // Space key đã được thay đổi sang PC

  if (!JIRA_BASE_URL || !JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
    console.log('⚠️ Không tìm thấy đầy đủ cấu hình Jira API. Bỏ qua bước tạo Bug.');
    return null;
  }

  const {
    description = 'Không có mô tả.',
    stepsToReproduce = [],
    expectedResult = 'Không có.',
    actualResult = 'Không có.',
    testUrl = 'http://localhost:5173',
    browser = 'Google Chrome (Selenium WebDriver)',
    priority = 'High',
    errorStack = null,
  } = bugDetails;

  const authHeader = 'Basic ' + Buffer.from(`${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

  // ===========================================================================
  // Xây dựng Description theo mẫu chuẩn dùng Atlassian Document Format (ADF)
  // ===========================================================================
  const makeHeading = (text, level = 3) => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  });

  const makeParagraph = (text) => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  });

  const makeOrderedList = (items) => ({
    type: 'orderedList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
    })),
  });

  const makeBulletList = (items) => ({
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
    })),
  });

  const makeCodeBlock = (text) => ({
    type: 'codeBlock',
    content: [{ type: 'text', text }],
  });

  const makeRule = () => ({ type: 'rule' });

  const descriptionContent = [
    makeHeading('📋 Description', 3),
    makeParagraph(description),
    makeRule(),

    makeHeading('🔁 Steps to Reproduce', 3),
    makeOrderedList(stepsToReproduce.length > 0 ? stepsToReproduce : ['(Không có bước chi tiết)']),
    makeRule(),

    makeHeading('✅ Expected Result', 3),
    makeParagraph(expectedResult),
    makeRule(),

    makeHeading('❌ Actual Result', 3),
    makeParagraph(actualResult),
    makeRule(),

    makeHeading('🌐 Environment', 3),
    makeBulletList([
      `URL: ${testUrl}`,
      `Browser: ${browser}`,
      `Priority: ${priority}`,
      `Detected by: Selenium Automated Test`,
      `Timestamp: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    ]),
  ];

  // Thêm Stack Trace nếu có
  if (errorStack) {
    descriptionContent.push(makeRule());
    descriptionContent.push(makeHeading('🐛 Error Stack Trace', 3));
    descriptionContent.push(makeCodeBlock(errorStack));
  }

  const payload = {
    fields: {
      project: { key: PROJECT_KEY },
      summary: `[Selenium] ${summary}`,
      description: {
        type: 'doc',
        version: 1,
        content: descriptionContent,
      },
      issuetype: { name: 'Bug' },
    },
  };

  try {
    console.log(`🔌 Đang kết nối tới Jira API để tạo Bug cho dự án ${PROJECT_KEY}...`);

    // 1. Tạo issue Bug
    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jira API Create Issue failed: ${response.status} - ${errText}`);
    }

    const issueData = await response.json();
    const issueKey = issueData.key;
    console.log(`✅ Đã tạo thành công Bug ticket trên Jira: ${issueKey}`);

    // 2. Upload ảnh screenshot đính kèm nếu có
    if (screenshotPath && fs.existsSync(screenshotPath)) {
      console.log(`📎 Đang tải ảnh chụp màn hình lên ticket ${issueKey}...`);

      const formData = new FormData();
      const fileBuffer = fs.readFileSync(screenshotPath);
      const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
      formData.append('file', fileBlob, path.basename(screenshotPath));

      const attachmentResponse = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'X-Atlassian-Token': 'no-check',
        },
        body: formData,
      });

      if (!attachmentResponse.ok) {
        const errText = await attachmentResponse.text();
        console.error(`❌ Không thể đính kèm file lên Jira:`, errText);
      } else {
        console.log(`✅ Đã đính kèm ảnh chụp màn hình thành công.`);
      }
    }

    return issueKey;
  } catch (error) {
    console.error('❌ Lỗi khi tích hợp tạo Bug trên Jira:', error.message);
    return null;
  }
}

module.exports = { reportBugToJira };
