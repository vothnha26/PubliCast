const { INBOX_STATUS, SOCIAL_TECHNICAL } = require('../../../utils/constants');

class InboxFormatter {
  formatInboxListItem(item) {
    const participants = this.aggregateParticipants(item);
    return {
      id: item.id,
      platform: this.formatPlatformName(item.platform),
      user: this.formatDisplayName(participants),
      participants: participants.slice(0, 3),
      avatar: item.authorAvatarUrl || item.authorName?.charAt(0) || '?',
      preview: item.content,
      time: this.formatTimeAgo(item.platformCreatedAt),
      unread: item.status === INBOX_STATUS.UNREAD,
      assigned: item.assignedUser?.name || null,
      status: item.status?.toLowerCase() || '',
      type: item.type?.toLowerCase() || ''
    };
  }

  aggregateParticipants(item) {
    const participants = [{ name: item.authorName, avatar: item.authorAvatarUrl }];
    const seenNames = new Set([item.authorName]);

    (item.replies || []).forEach(r => {
      if (r.authorId !== item.authorId && !seenNames.has(r.authorName)) {
        seenNames.add(r.authorName);
        participants.push({ name: r.authorName, avatar: r.authorAvatarUrl });
      }
    });
    return participants;
  }

  formatDisplayName(participants) {
    if (participants.length === 0) return 'Unknown';
    if (participants.length === 1) return participants[0].name;
    let name = `${participants[0].name} and ${participants[1].name}`;
    if (participants.length > 2) name += ` and ${participants.length - 2} others`;
    return name;
  }

  formatThreadMessage(msg, myAccountId) {
    const isMe = msg.repliedByUserId || msg.authorId === myAccountId;
    return {
      id: msg.id,
      from: isMe ? SOCIAL_TECHNICAL.INBOX_LABELS.ME : SOCIAL_TECHNICAL.INBOX_LABELS.THEM,
      text: msg.content,
      time: new Date(msg.platformCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: msg.authorName,
      avatar: msg.authorAvatarUrl
    };
  }

  formatPlatformName(p) {
    return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : 'Unknown';
  }

  formatTimeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}

module.exports = new InboxFormatter();
