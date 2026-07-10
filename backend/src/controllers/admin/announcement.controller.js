const prisma = require('../../config/prisma');
const notificationService = require('../../services/core/notification.service');
const asyncHandler = require('../../utils/async-handler');

class AnnouncementController {
  /**
   * Lấy danh sách toàn bộ thông báo hệ thống (Announcements) đã phát
   */
  getAnnouncements = asyncHandler(async (req, res) => {
    const announcements = await prisma.systemNotification.findMany({
      where: { isGlobal: true },
      orderBy: { createdAt: 'desc' },
      include: {
        readReceipts: {
          select: {
            userId: true,
            readAt: true
          }
        }
      }
    });

    const formatted = announcements.map(ann => ({
      id: ann.id,
      title: ann.title,
      message: ann.message,
      type: ann.type,
      actionUrl: ann.actionUrl,
      createdAt: ann.createdAt,
      readCount: ann.readReceipts.length
    }));

    res.status(200).json({
      success: true,
      data: formatted
    });
  });

  /**
   * Tạo và phát một thông báo hệ thống mới
   */
  createAnnouncement = asyncHandler(async (req, res) => {
    const { title, message, type = 'system', actionUrl = null } = req.body;

    const notification = await notificationService.create({
      title,
      message,
      type,
      isGlobal: true,
      actionUrl
    }, {
      userId: req.user.id,
      role: req.user.role
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  });

  /**
   * Xóa một thông báo hệ thống đã phát
   */
  deleteAnnouncement = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notif = await prisma.systemNotification.findFirst({
      where: { id, isGlobal: true }
    });

    if (!notif) {
      const error = new Error('Không tìm thấy thông báo hệ thống này');
      error.status = 404;
      throw error;
    }

    await prisma.systemNotification.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo hệ thống thành công'
    });
  });
}

module.exports = new AnnouncementController();
