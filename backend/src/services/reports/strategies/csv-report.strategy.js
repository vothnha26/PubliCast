const ExcelJS = require('exceljs');
const axios = require('axios');
const ReportGeneratorStrategy = require('./report-generator.strategy');

async function fetchChartImage(chartConfig) {
  try {
    const url = 'https://quickchart.io/chart';
    const response = await axios.post(url, {
      chart: chartConfig,
      width: 500,
      height: 250,
      backgroundColor: 'white'
    }, {
      responseType: 'arraybuffer',
      timeout: 8000
    });
    return Buffer.from(response.data);
  } catch (err) {
    console.warn('[QuickChart] Failed to fetch chart image:', err.message);
    return null;
  }
}

const DEFAULT_BRAND_COLOR = '#3B82F6';
const HEX_COLOR_PATTERN = /^#?[0-9A-Fa-f]{6}$/;

class CsvReportStrategy extends ReportGeneratorStrategy {
  async generate(title, brand, data, options = {}) {
    const brandName = brand?.name || 'PubliCast Brand';
    const includedSections = options.includedSections || ['Overview', 'Channels', 'TopPosts'];
    // Validate before use anywhere — this value both drives ExcelJS cell
    // fills and is forwarded as-is to quickchart.io (an external service) for
    // chart rendering, so an unvalidated string shouldn't reach either.
    const brandColorHex = HEX_COLOR_PATTERN.test(options.brandColorHex || '')
      ? options.brandColorHex
      : DEFAULT_BRAND_COLOR;
    const cleanColor = brandColorHex.replace('#', '');
    const argbColor = `FF${cleanColor}`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PubliCast';
    workbook.created = new Date();

    // Common styles
    const titleFont = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const sectionHeaderFont = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F2937' } };
    const normalFont = { name: 'Arial', size: 10 };
    const boldFont = { name: 'Arial', size: 10, bold: true };

    const titleFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argbColor }
    };

    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argbColor }
    };

    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    };

    // 1. Overview Sheet
    if (includedSections.includes('Overview')) {
      const ws = workbook.addWorksheet('Tổng Quan Hiệu Suất');
      ws.views = [{ showGridLines: true }];

      // Report Header Block
      ws.mergeCells('A1:C2');
      const titleCell = ws.getCell('A1');
      titleCell.value = `BÁO CÁO PHÂN TÍCH: ${title.toUpperCase()}`;
      titleCell.font = titleFont;
      titleCell.fill = titleFill;
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

      ws.addRow([]); // Blank row
      ws.addRow(['Thương hiệu:', brandName]).eachCell(c => c.font = boldFont);
      ws.addRow(['Ngày xuất bản:', new Date().toLocaleDateString('vi-VN')]).eachCell(c => c.font = boldFont);
      ws.addRow([]); // Blank row

      // Table Title
      const secRow = ws.addRow(['1. CHỈ SỐ TỔNG QUAN']);
      secRow.getCell(1).font = sectionHeaderFont;
      ws.addRow([]);

      // Table Headers
      const tHeader = ws.addRow(['Chỉ số', 'Giá trị']);
      tHeader.eachCell(cell => {
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center' };
      });

      // Data Rows
      const rows = [
        ['Tổng lượt tiếp cận (Reach)', data.overview?.reach || 0],
        ['Tổng lượt hiển thị (Impressions)', data.overview?.impressions || 0],
        ['Tổng lượt tương tác (Engagements)', data.overview?.engagements || 0],
        ['Tỷ lệ tương tác trung bình (Engagement Rate)', (data.overview?.engagementRate || 0).toFixed(2) + '%']
      ];

      rows.forEach((r, idx) => {
        const row = ws.addRow(r);
        row.getCell(1).font = normalFont;
        row.getCell(1).border = borderStyle;
        
        const valCell = row.getCell(2);
        valCell.font = normalFont;
        valCell.border = borderStyle;
        if (idx === 3) {
          valCell.alignment = { horizontal: 'right' };
        } else {
          valCell.numberFormat = '#,##0';
          valCell.alignment = { horizontal: 'right' };
        }
      });

      autofitColumns(ws);
    }

    // 2. Channels Sheet
    if (includedSections.includes('Channels')) {
      const ws = workbook.addWorksheet('Chi Tiết Từng Kênh');
      ws.views = [{ showGridLines: true }];

      // Sheet Title
      const titleRow = ws.addRow(['2. HIỆU SUẤT CHI TIẾT TỪNG KÊNH']);
      titleRow.getCell(1).font = sectionHeaderFont;
      ws.addRow([]);

      // Table Headers
      const tHeader = ws.addRow(['Nền tảng', 'Tên hiển thị', 'Followers / Subscribers', 'Số lượng bài viết', 'Tỷ lệ tương tác']);
      tHeader.eachCell(cell => {
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data Rows
      if (data.channels && data.channels.length > 0) {
        data.channels.forEach(ch => {
          const row = ws.addRow([
            ch.platform || '',
            ch.displayName || '',
            ch.followers || 0,
            ch.postsCount || 0,
            (ch.engagementRate || 0).toFixed(2) + '%'
          ]);

          row.eachCell((cell, colNum) => {
            cell.font = normalFont;
            cell.border = borderStyle;
            if (colNum === 1 || colNum === 2) {
              cell.alignment = { horizontal: 'left' };
            } else if (colNum === 3 || colNum === 4) {
              cell.numberFormat = '#,##0';
              cell.alignment = { horizontal: 'right' };
            } else if (colNum === 5) {
              cell.alignment = { horizontal: 'right' };
            }
          });
        });
      } else {
        const row = ws.addRow(['Không có dữ liệu kênh nào kết nối.']);
        ws.mergeCells(`A${row.number}:E${row.number}`);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(1).font = normalFont;
        row.getCell(1).border = borderStyle;
      }

      autofitColumns(ws);
    }

    // 3. Top Posts Sheet
    if (includedSections.includes('TopPosts')) {
      const ws = workbook.addWorksheet('Bài Viết Nổi Bật');
      ws.views = [{ showGridLines: true }];

      // Sheet Title
      const titleRow = ws.addRow(['3. DANH SÁCH BÀI VIẾT NỔI BẬT (VIRAL POSTS)']);
      titleRow.getCell(1).font = sectionHeaderFont;
      ws.addRow([]);

      // Table Headers
      const tHeader = ws.addRow(['Hạng', 'Nền tảng', 'Nội dung bài viết', 'Lượt thích (Likes)', 'Bình luận (Comments)', 'Chia sẻ (Shares)', 'Tỷ lệ tương tác']);
      tHeader.eachCell(cell => {
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderStyle;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Data Rows
      if (data.topPosts && data.topPosts.length > 0) {
        data.topPosts.forEach((post, idx) => {
          const postContent = post.title || post.caption || 'Không có tiêu đề';
          const row = ws.addRow([
            idx + 1,
            post.platform || '',
            postContent,
            post.likes || 0,
            post.comments || 0,
            post.shares || 0,
            (post.engagementRate || 0).toFixed(2) + '%'
          ]);

          row.eachCell((cell, colNum) => {
            cell.font = normalFont;
            cell.border = borderStyle;
            if (colNum === 1) {
              cell.alignment = { horizontal: 'center' };
            } else if (colNum === 2) {
              cell.alignment = { horizontal: 'left' };
            } else if (colNum === 3) {
              cell.alignment = { horizontal: 'left', wrapText: true };
            } else if (colNum >= 4 && colNum <= 6) {
              cell.numberFormat = '#,##0';
              cell.alignment = { horizontal: 'right' };
            } else if (colNum === 7) {
              cell.alignment = { horizontal: 'right' };
            }
          });
        });
      } else {
        const row = ws.addRow(['Không có bài viết nổi bật nào trong thời gian này.']);
        ws.mergeCells(`A${row.number}:G${row.number}`);
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(1).font = normalFont;
        row.getCell(1).border = borderStyle;
      }

      autofitColumns(ws);
      // Give the content column a bit more width specifically
      const contentCol = ws.getColumn(3);
      if (contentCol.width < 30) {
        contentCol.width = 40;
      }
    }

    // 4. Dynamic Platform Specific Sheets based on selectedWidgets
    const widgets = options.selectedWidgets || {};
    const hasWidgetsConfig = Object.keys(widgets).length > 0;

    if (hasWidgetsConfig && data.channels && data.channels.length > 0) {
      for (const ch of data.channels) {
        const platformUpper = ch.platform.toUpperCase();
        const displayName = ch.displayName || ch.platform;
        const analyticsData = ch.analyticsData;

        if (!analyticsData) continue;

        // Check if there are active widgets for this platform
        let hasActiveWidget = false;
        let platformWidgets = [];

        if (platformUpper === 'TIKTOK') {
          platformWidgets = ['ttGrowth', 'ttBalance', 'ttViews', 'ttInteractions', 'ttPosts'];
        } else if (platformUpper === 'FACEBOOK') {
          platformWidgets = ['fbGrowth', 'fbBalance', 'fbViews', 'fbInteractions', 'fbTypesBreakdown', 'fbViewsBreakdown', 'fbRankingOfPosts'];
        } else if (platformUpper === 'INSTAGRAM') {
          platformWidgets = ['igGrowth', 'igRankingOfPosts'];
        } else if (platformUpper === 'YOUTUBE') {
          platformWidgets = ['ytGrowth', 'ytRankingOfVideos'];
        } else if (platformUpper === 'DISCORD') {
          platformWidgets = ['dcGrowth'];
        }

        hasActiveWidget = platformWidgets.some(w => widgets[w] === true);

        if (!hasActiveWidget) continue;

        // Create a custom sheet for this platform
        const wsName = `Hiệu suất ${displayName.slice(0, 20)}`;
        const ws = workbook.addWorksheet(wsName);
        ws.views = [{ showGridLines: true }];

        // Sheet Header
        const headerRow = ws.addRow([`BÁO CÁO HIỆU SUẤT CHI TIẾT - KÊNH ${platformUpper.toUpperCase()}`]);
        headerRow.getCell(1).font = sectionHeaderFont;
        ws.addRow([]);

        // Helper function to add a table and insert chart next to it
        const addTableAndChart = async (title, headers, rowsData, alignments = [], chartConfig = null) => {
          const startRow = ws.rowCount + 1;
          
          const tTitle = ws.addRow([title]);
          tTitle.getCell(1).font = { ...normalFont, bold: true, color: { argb: '333333' } };
          
          const tHeader = ws.addRow(headers);
          tHeader.eachCell(cell => {
            cell.font = headerFont;
            cell.fill = headerFill;
            cell.border = borderStyle;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          });

          rowsData.forEach(r => {
            const row = ws.addRow(r);
            row.eachCell((cell, colNum) => {
              cell.font = normalFont;
              cell.border = borderStyle;
              
              const align = alignments[colNum - 1] || 'right';
              cell.alignment = { horizontal: align };

              // Auto format numeric fields (skip string percentages)
              if (typeof cell.value === 'number') {
                cell.numberFormat = '#,##0';
              }
            });
          });

          const endRow = ws.rowCount;
          const tableHeight = endRow - startRow + 1;

          // Fetch and insert chart if provided
          if (chartConfig) {
            const chartBuffer = await fetchChartImage(chartConfig);
            if (chartBuffer) {
              try {
                const imageId = workbook.addImage({
                  buffer: chartBuffer,
                  extension: 'png'
                });
                
                // Insert image at column F (colIndex 5), row startRow
                ws.addImage(imageId, {
                  tl: { col: 5, row: startRow - 1 },
                  ext: { width: 450, height: 220 }
                });
              } catch (e) {
                console.warn('[ExcelJS Add Image Error]', e.message);
              }
            }
          }

          // Ensure worksheet has enough rows to fit the chart (chart takes ~12 rows)
          const minRowsForChart = 13;
          if (tableHeight < minRowsForChart) {
            const extraRowsNeeded = minRowsForChart - tableHeight;
            for (let i = 0; i < extraRowsNeeded; i++) {
              ws.addRow([]);
            }
          }

          ws.addRow([]); // Blank row spacer
        };

        // Render sections based on active widgets
        // 1. Growth Widget
        const showGrowth = (platformUpper === 'TIKTOK' && widgets.ttGrowth) ||
                            (platformUpper === 'FACEBOOK' && widgets.fbGrowth) ||
                            (platformUpper === 'INSTAGRAM' && widgets.igGrowth) ||
                            (platformUpper === 'YOUTUBE' && widgets.ytGrowth) ||
                            (platformUpper === 'DISCORD' && widgets.dcGrowth);

        if (showGrowth && Array.isArray(analyticsData.growth) && analyticsData.growth.length > 0) {
          const headers = ['Ngày', 'Tổng Followers', 'Lượt xem (Views)', 'Lượt tương tác (Engagements)'];
          const rowsData = analyticsData.growth.map(d => [
            d.date || d.name || '',
            d.followers || 0,
            d.views || d.pageVisits || 0,
            (d.reactions || 0) + (d.comments || 0) + (d.shares || 0)
          ]);

          const chartConfig = {
            type: 'line',
            data: {
              labels: analyticsData.growth.map(d => d.name || d.date || ''),
              datasets: [{
                label: 'Tổng Followers',
                data: analyticsData.growth.map(d => d.followers || 0),
                borderColor: brandColorHex,
                backgroundColor: brandColorHex + '1A',
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              title: { display: true, text: 'Xu hướng tăng trưởng người theo dõi' },
              responsive: false
            }
          };

          await addTableAndChart('1. DỮ LIỆU TĂNG TRƯỞNG & LƯỢT XEM THEO NGÀY', headers, rowsData, ['center', 'right', 'right', 'right'], chartConfig);
        }

        // 2. Balance Widget
        const showBalance = (platformUpper === 'TIKTOK' && widgets.ttBalance) ||
                             (platformUpper === 'FACEBOOK' && widgets.fbBalance);

        if (showBalance && Array.isArray(analyticsData.balance) && analyticsData.balance.length > 0) {
          const headers = ['Ngày', 'Lượt follow mới (Acquired)', 'Hủy follow (Lost)', 'Tăng trưởng ròng'];
          const rowsData = analyticsData.balance.map(d => [
            d.date || d.name || '',
            d.acquired || 0,
            d.lost || 0,
            (d.acquired || 0) - (d.lost || 0)
          ]);

          const chartConfig = {
            type: 'bar',
            data: {
              labels: analyticsData.balance.map(d => d.name || d.date || ''),
              datasets: [
                {
                  label: 'Follow mới',
                  data: analyticsData.balance.map(d => d.acquired || 0),
                  backgroundColor: '#10B981'
                },
                {
                  label: 'Hủy follow',
                  data: analyticsData.balance.map(d => d.lost || 0),
                  backgroundColor: '#EF4444'
                }
              ]
            },
            options: {
              title: { display: true, text: 'Biến động người theo dõi hàng ngày (Balance)' },
              responsive: false
            }
          };

          await addTableAndChart('2. BIẾN ĐỘNG NGƯỜI THEO DÕI HÀNG NGÀY (BALANCE)', headers, rowsData, ['center', 'right', 'right', 'right'], chartConfig);
        }

        // 3. Views Stats Widget
        const showViews = (platformUpper === 'TIKTOK' && widgets.ttViews) ||
                           (platformUpper === 'FACEBOOK' && widgets.fbViews);

        if (showViews && Array.isArray(analyticsData.growth) && analyticsData.growth.length > 0) {
          const headers = ['Ngày', 'Lượt xem/Truy cập'];
          const rowsData = analyticsData.growth.map(d => [
            d.date || d.name || '',
            d.views || d.pageVisits || 0
          ]);

          const chartConfig = {
            type: 'line',
            data: {
              labels: analyticsData.growth.map(d => d.name || d.date || ''),
              datasets: [{
                label: 'Lượt xem',
                data: analyticsData.growth.map(d => d.views || d.pageVisits || 0),
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F61A',
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              title: { display: true, text: 'Thống kê lượt xem theo ngày' },
              responsive: false
            }
          };

          await addTableAndChart('3. THỐNG KÊ LƯỢT XEM CHI TIẾT', headers, rowsData, ['center', 'right'], chartConfig);
        }

        // 4. Interactions Widget
        const showInteractions = (platformUpper === 'TIKTOK' && widgets.ttInteractions) ||
                                  (platformUpper === 'FACEBOOK' && widgets.fbInteractions);

        if (showInteractions && Array.isArray(analyticsData.growth) && analyticsData.growth.length > 0) {
          const headers = ['Ngày', 'Cảm xúc (Reactions/Likes)', 'Bình luận', 'Chia sẻ'];
          const rowsData = analyticsData.growth.map(d => [
            d.date || d.name || '',
            d.reactions || 0,
            d.comments || 0,
            d.shares || 0
          ]);

          const chartConfig = {
            type: 'bar',
            data: {
              labels: analyticsData.growth.map(d => d.name || d.date || ''),
              datasets: [
                {
                  label: 'Likes',
                  data: analyticsData.growth.map(d => d.reactions || 0),
                  backgroundColor: '#3B82F6'
                },
                {
                  label: 'Bình luận',
                  data: analyticsData.growth.map(d => d.comments || 0),
                  backgroundColor: '#F59E0B'
                },
                {
                  label: 'Chia sẻ',
                  data: analyticsData.growth.map(d => d.shares || 0),
                  backgroundColor: '#8B5CF6'
                }
              ]
            },
            options: {
              title: { display: true, text: 'Tương tác chi tiết hàng ngày' },
              responsive: false
            }
          };

          await addTableAndChart('4. CHI TIẾT TƯƠNG TÁC HÀNG NGÀY', headers, rowsData, ['center', 'right', 'right', 'right'], chartConfig);
        }

        autofitColumns(ws);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx'
    };
  }
}

function autofitColumns(worksheet) {
  worksheet.columns.forEach(column => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      // Avoid merging cells calculation issues
      if (cell.address.includes(':') || (cell.master && cell.master.address !== cell.address)) {
        return;
      }
      const valStr = cell.value ? String(cell.value) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    // Add extra padding and limit min/max width
    column.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });
}

module.exports = CsvReportStrategy;
